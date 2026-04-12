"""
EcoShore ML — Training Script
-------------------------------
Trains a Random Forest regressor on historical beach pollution data.
Optionally refines predictions using Prophet for time-series trends.

Usage:
  python train.py

Output:
  models/rf_model.pkl      — Trained Random Forest model
  models/prophet_model.pkl — Trained Prophet model (time-series trend)

Requirements:
  - MONGO_URI env var (same MongoDB Atlas used by the Node backend)
  - Sufficient WasteRecord documents (ideally 100+)
  - The models/ directory will be created automatically
"""

import os
import json
import joblib
import warnings
import numpy as np
import pandas as pd

from datetime import datetime, timedelta
from dotenv import load_dotenv

warnings.filterwarnings("ignore")  # Suppress Prophet verbose output

# ── Load environment ─────────────────────────────────────────────────────── #
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


# ── Data helpers ─────────────────────────────────────────────────────────── #

def _fetch_from_mongo() -> pd.DataFrame:
    """
    Pull historical WasteRecord data from MongoDB Atlas.
    Returns a DataFrame with columns needed for training.
    """
    from pymongo import MongoClient

    if not MONGO_URI:
        raise EnvironmentError("MONGO_URI is not set. Cannot fetch training data.")

    print("[Train] Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client.get_default_database()

    # Pull waste records with beach analytics embedded via lookup
    pipeline = [
        {"$match": {"isVerified": True}},
        {
            "$lookup": {
                "from": "beaches",
                "localField": "beachId",
                "foreignField": "_id",
                "as": "beach",
            }
        },
        {"$unwind": "$beach"},
        {
            "$project": {
                "date":               "$collectionDate",
                "weight":             1,
                "plasticType":        1,
                "severityScore":      "$beach.analytics.severityScore",
                "totalWasteCollected":"$beach.analytics.totalWasteCollected",
                "totalCleanups":      "$beach.analytics.totalCleanups",
            }
        },
    ]

    records = list(db.wasterecords.aggregate(pipeline))
    client.close()

    if not records:
        print("[Train] No waste records found in MongoDB — using synthetic data.")
        return _generate_synthetic_data()

    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"])
    print(f"[Train] Fetched {len(df)} real records from MongoDB.")
    return df


def _generate_synthetic_data(n_samples: int = 500) -> pd.DataFrame:
    """
    Generate synthetic training data when MongoDB records are insufficient.
    Models realistic Sri Lanka beach pollution patterns:
    - Higher pollution in monsoon season (May–Sep)
    - Lower pollution after cleanups
    - Rain increases score, strong wind decreases it
    """
    print(f"[Train] Generating {n_samples} synthetic training samples...")
    np.random.seed(42)

    dates = [datetime(2024, 1, 1) + timedelta(days=np.random.randint(0, 730))
             for _ in range(n_samples)]

    rows = []
    for d in dates:
        month = d.month
        # Monsoon boost: months 5-9 in Sri Lanka (southwest monsoon)
        monsoon = 1.3 if 5 <= month <= 9 else 1.0

        temp          = np.random.normal(29, 3)
        humidity      = np.random.normal(75, 10) * monsoon
        wind_speed    = np.random.uniform(2, 12)
        precipitation = np.random.exponential(5) * monsoon
        uv_index      = np.random.uniform(6, 12)
        severity_base = np.random.uniform(10, 80)

        # Target: severity score influenced by weather
        target = severity_base
        target += precipitation * 0.7
        target -= max(0, wind_speed - 5) * 0.4
        target += (humidity - 70) * 0.15
        target += (month in [5, 6, 7, 8, 9]) * 10  # monsoon bump
        target = float(np.clip(target, 0, 100))

        rows.append({
            "date":               d,
            "weight":             np.random.uniform(5, 200),
            "severityScore":      severity_base,
            "totalWasteCollected":np.random.uniform(100, 5000),
            "totalCleanups":      np.random.randint(1, 100),
            "temp":               temp,
            "humidity":           humidity,
            "wind_speed":         wind_speed,
            "precipitation":      precipitation,
            "uv_index":           uv_index,
            "target_score":       target,
        })

    return pd.DataFrame(rows)


# ── Feature engineering ───────────────────────────────────────────────────── #

def _build_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """
    Build the feature matrix X and target vector y.
    NOTE: Column order must match RF_FEATURE_COLS in predictor.py exactly.
    """
    df = df.copy()
    df["month"]       = df["date"].dt.month
    df["day_of_week"] = df["date"].dt.dayofweek

    # If real MongoDB records don't have weather columns, fill with typical SL values
    for col, default in [
        ("temp", 29), ("humidity", 75), ("wind_speed", 4),
        ("precipitation", 2), ("uv_index", 9),
    ]:
        if col not in df.columns:
            df[col] = default

    feature_cols = [
        "month", "day_of_week", "temp", "humidity", "wind_speed",
        "precipitation", "uv_index",
        "severityScore", "totalWasteCollected", "totalCleanups",
    ]
    # Fill any remaining NaNs with column medians
    df[feature_cols] = df[feature_cols].fillna(df[feature_cols].median())

    # Target: use explicit target_score if synthetic, else use weight as proxy
    if "target_score" in df.columns:
        y = df["target_score"].values
    else:
        # Real records: normalise weight to 0-100 range as proxy for risk score
        max_w = df["weight"].max() or 1
        y = np.clip((df["weight"] / max_w) * 100, 0, 100).values

    X = df[feature_cols].values
    return X, y


# ── Training functions ────────────────────────────────────────────────────── #

def _train_random_forest(X: np.ndarray, y: np.ndarray):
    """Train a Random Forest Regressor and return the fitted model."""
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, r2_score

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("[Train] Training Random Forest Regressor...")
    rf = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    # Evaluate
    preds = rf.predict(X_test)
    mae   = mean_absolute_error(y_test, preds)
    r2    = r2_score(y_test, preds)
    print(f"[Train] RF Results — MAE: {mae:.2f}  R²: {r2:.4f}")

    return rf, {"mae": round(mae, 2), "r2": round(r2, 4)}


def _train_prophet(df: pd.DataFrame):
    """
    Train a Prophet model on aggregated daily waste weight as a time-series.
    Returns the fitted model or None if Prophet is unavailable.
    """
    try:
        from prophet import Prophet
    except ImportError:
        print("[Train] Prophet not installed — skipping time-series model.")
        return None, {}

    # Prophet expects 'ds' (datestamp) and 'y' (target)
    ts = (
        df.groupby(df["date"].dt.date)["weight"]
        .sum()
        .reset_index()
        .rename(columns={"date": "ds", "weight": "y"})
    )
    ts["ds"] = pd.to_datetime(ts["ds"])

    if len(ts) < 10:
        print("[Train] Not enough time-series points for Prophet — skipping.")
        return None, {}

    print("[Train] Training Prophet time-series model...")
    model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
    model.add_seasonality(name="monsoon", period=365.25 / 2, fourier_order=5)
    model.fit(ts)

    # Quick in-sample eval
    future = model.make_future_dataframe(periods=30)
    forecast = model.predict(future)
    print(f"[Train] Prophet training complete — {len(ts)} data points used.")

    return model, {"data_points": len(ts)}


# ── Entry point ──────────────────────────────────────────────────────────── #

def run_training() -> dict:
    """
    Main training pipeline. Returns a summary dict consumed by app.py /train.
    """
    os.makedirs(MODELS_DIR, exist_ok=True)

    # 1. Fetch or generate data
    try:
        df = _fetch_from_mongo()
    except Exception as e:
        print(f"[Train] MongoDB fetch failed ({e}) — using synthetic data.")
        df = _generate_synthetic_data()

    # 2. Build features
    X, y = _build_features(df)
    print(f"[Train] Feature matrix: {X.shape[0]} samples × {X.shape[1]} features")

    # 3. Train Random Forest
    rf_model, rf_metrics = _train_random_forest(X, y)
    rf_path = os.path.join(MODELS_DIR, "rf_model.pkl")
    joblib.dump(rf_model, rf_path)
    print(f"[Train] Saved RF model → {rf_path}")

    # 4. Train Prophet
    prophet_model, prophet_metrics = _train_prophet(df)
    if prophet_model is not None:
        prophet_path = os.path.join(MODELS_DIR, "prophet_model.pkl")
        joblib.dump(prophet_model, prophet_path)
        print(f"[Train] Saved Prophet model → {prophet_path}")

    summary = {
        "trainedAt":     datetime.utcnow().isoformat() + "Z",
        "sampleCount":   int(X.shape[0]),
        "randomForest":  rf_metrics,
        "prophet":       prophet_metrics,
        "modelsDir":     MODELS_DIR,
    }
    print("[Train] Training complete:", json.dumps(summary, indent=2))
    return summary


if __name__ == "__main__":
    run_training()
