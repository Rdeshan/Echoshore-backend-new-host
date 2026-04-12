"""
EcoShore ML Predictor
---------------------
Encapsulates model loading and inference logic.
Separates prediction concerns from the Flask app layer.
"""

import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime


# Feature columns the Random Forest was trained on
RF_FEATURE_COLS = [
    "month",
    "day_of_week",
    "temp",
    "humidity",
    "wind_speed",
    "precipitation",
    "uv_index",
    "severity_score",
    "total_waste_collected",
    "total_cleanups",
]

RISK_THRESHOLDS = {
    "LOW":      (0,  25),
    "MODERATE": (25, 50),
    "HIGH":     (50, 75),
    "CRITICAL": (75, 100),
}

RISK_COLORS = {
    "LOW":      "#22c55e",
    "MODERATE": "#eab308",
    "HIGH":     "#f97316",
    "CRITICAL": "#ef4444",
}


def _score_to_risk(score: float) -> str:
    score = max(0, min(100, score))
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 25:
        return "MODERATE"
    return "LOW"


class Predictor:
    """
    Loads pre-trained Random Forest and Prophet models from disk and
    produces pollution risk predictions for a given beach + 7-day weather.
    Falls back to a rules-based calculation if models are not yet trained.
    """

    MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
    RF_PATH    = os.path.join(MODEL_DIR, "rf_model.pkl")
    PROP_PATH  = os.path.join(MODEL_DIR, "prophet_model.pkl")

    def __init__(self):
        self.rf_model     = None
        self.prophet_model = None
        self.model_loaded = False
        self._try_load_models()

    # ------------------------------------------------------------------ #
    # Model loading
    # ------------------------------------------------------------------ #

    def _try_load_models(self):
        """Attempt to load persisted models; silently no-op if not found."""
        try:
            if os.path.exists(self.RF_PATH):
                self.rf_model = joblib.load(self.RF_PATH)
            if os.path.exists(self.PROP_PATH):
                self.prophet_model = joblib.load(self.PROP_PATH)
            if self.rf_model is not None:
                self.model_loaded = True
                print("[Predictor] Models loaded successfully.")
            else:
                print("[Predictor] No trained models found — using rules-based fallback.")
        except Exception as exc:
            print(f"[Predictor] Failed to load models: {exc}")

    def reload_models(self):
        """Hot-reload models after re-training without restarting Flask."""
        self._try_load_models()

    # ------------------------------------------------------------------ #
    # Feature engineering
    # ------------------------------------------------------------------ #

    def _build_features(self, beach: dict, day: dict, date_str: str) -> np.ndarray:
        """
        Convert raw beach + single-day weather into an ML feature row.
        Must match the column order used during training (RF_FEATURE_COLS).
        """
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return np.array([[
            dt.month,
            dt.weekday(),
            float(day.get("temp", 28)),
            float(day.get("humidity", 75)),
            float(day.get("windSpeed", 4)),
            float(day.get("precipitation", 0)),
            float(day.get("uvIndex", 8)),
            float(beach.get("severityScore", 30)),
            float(beach.get("totalWasteCollected", 0)),
            float(beach.get("totalCleanups", 0)),
        ]])

    # ------------------------------------------------------------------ #
    # Fallback (no trained model)
    # ------------------------------------------------------------------ #

    def _rules_based_score(self, beach: dict, day: dict) -> tuple[float, float]:
        """
        Simple physics-inspired heuristic:
        - Rain drives surface runoff → higher pollution
        - High wind disperses floating debris → lower score
        - High humidity correlated with monsoon → slightly higher risk
        Returns (score, confidence)
        """
        base     = float(beach.get("severityScore", 30))
        rain_factor     = min(float(day.get("precipitation", 0)) * 0.8, 15)
        wind_factor     = max(0, (float(day.get("windSpeed", 4)) - 5) * -0.5)
        humidity_factor = (float(day.get("humidity", 75)) - 70) * 0.1
        score = max(0, min(100, base + rain_factor + wind_factor + humidity_factor))
        return score, 0.60

    # ------------------------------------------------------------------ #
    # Ensemble inference
    # ------------------------------------------------------------------ #

    def _ml_score(self, beach: dict, day: dict, date_str: str) -> tuple[float, float]:
        """
        Random Forest prediction (primary).
        Returns (score, confidence).
        """
        features = self._build_features(beach, day, date_str)
        rf_score = float(self.rf_model.predict(features)[0])
        rf_score = max(0, min(100, rf_score))
        return rf_score, 0.85

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def predict(self, beach: dict, weather_7day: list) -> list:
        """
        Produce a 7-element list of daily pollution risk predictions.

        Args:
            beach       — dict with keys: severityScore, totalWasteCollected,
                          totalCleanups, name, id
            weather_7day — list of 7 dicts each with: date, temp, humidity,
                          windSpeed, precipitation, uvIndex

        Returns:
            list of dicts: { date, riskScore, riskLevel, color, confidence, source }
        """
        results = []

        for i, day in enumerate(weather_7day[:7]):
            date_str = day.get("date", "")

            if self.model_loaded:
                score, confidence = self._ml_score(beach, day, date_str)
                source = "random-forest"
            else:
                score, confidence = self._rules_based_score(beach, day)
                source = "rules-based"

            # Confidence decays slightly for later days (less reliable forecast)
            decay = 0.03 * i
            confidence = round(max(0.50, confidence - decay), 2)

            risk_level = _score_to_risk(score)

            results.append({
                "date":        date_str,
                "riskScore":   round(score, 2),
                "riskLevel":   risk_level,
                "color":       RISK_COLORS[risk_level],
                "confidence":  confidence,
                "source":      source,
                "weatherSnapshot": {
                    "temp":          day.get("temp"),
                    "humidity":      day.get("humidity"),
                    "precipitation": day.get("precipitation"),
                    "windSpeed":     day.get("windSpeed"),
                },
            })

        return results


# Module-level singleton — imported by app.py
predictor = Predictor()
