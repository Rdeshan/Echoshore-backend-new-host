"""
EcoShore ML Microservice — Flask App
--------------------------------------
Exposes three REST endpoints:
  POST /predict   — Run pollution risk prediction for a beach + 7-day weather
  GET  /health    — Service health check + model status
  POST /train     — Trigger model retraining (admin password protected)

Run locally:
  python app.py
  # or for production:
  gunicorn -w 2 -b 0.0.0.0:5001 app:app
"""

import os
import sys
import traceback

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# ── Bootstrap ────────────────────────────────────────────────────────────── #
load_dotenv()

# Ensure predictor module (in same dir) is importable
sys.path.insert(0, os.path.dirname(__file__))
from predictor import predictor  # noqa: E402  module-level singleton

app = Flask(__name__)

# Allow requests from the Node backend and (optionally) local frontend dev
CORS(app, resources={r"/*": {"origins": [
    "http://localhost:4000",   # Node.js backend
    "http://localhost:5173",   # Vite frontend (dev)
    "http://localhost:3000",   # CRA frontend (dev)
]}})

# Admin password for the /train endpoint (override via env var)
TRAIN_SECRET = os.getenv("ML_TRAIN_SECRET", "ecoshore_train_secret")


# ── Helpers ──────────────────────────────────────────────────────────────── #

def _err(message: str, status: int = 400):
    return jsonify({"success": False, "error": message}), status


def _ok(data: dict, message: str = "OK"):
    return jsonify({"success": True, "message": message, "data": data})


# ── Routes ───────────────────────────────────────────────────────────────── #

@app.route("/health", methods=["GET"])
def health():
    """
    Health check endpoint.
    The Node.js heatmapService pings this before deciding to use rules-based fallback.
    """
    return _ok({
        "status":       "ok",
        "modelLoaded":  predictor.model_loaded,
        "service":      "EcoShore ML Microservice",
        "version":      "1.0.0",
        "fallbackMode": not predictor.model_loaded,
    }, "Service is healthy")


@app.route("/predict", methods=["POST"])
def predict():
    """
    Pollution risk prediction endpoint.

    Expected JSON body:
    {
      "beach": {
        "id": "...",
        "name": "Galle Face",
        "severityScore": 45.2,
        "totalWasteCollected": 1200,
        "totalCleanups": 34,
        "location": { "city": "Colombo", ... }
      },
      "weather": [
        {
          "date": "2026-02-21",
          "temp": 29.5,
          "humidity": 80,
          "windSpeed": 5.2,
          "precipitation": 4.1,
          "uvIndex": 9
        },
        ... (7 items)
      ]
    }

    Returns:
    {
      "success": true,
      "data": {
        "predictions": [
          {
            "date": "2026-02-21",
            "riskScore": 62.4,
            "riskLevel": "HIGH",
            "color": "#f97316",
            "confidence": 0.85,
            "source": "random-forest",
            "weatherSnapshot": { ... }
          },
          ... (7 items)
        ]
      }
    }
    """
    try:
        body = request.get_json(force=True)
    except Exception:
        return _err("Request body must be valid JSON")

    # ── Validate required keys ───────────────────────────────────────────── #
    if not body or "beach" not in body or "weather" not in body:
        return _err("Request body must include 'beach' and 'weather' fields")

    beach   = body["beach"]
    weather = body["weather"]

    if not isinstance(weather, list) or len(weather) == 0:
        return _err("'weather' must be a non-empty array of daily forecast objects")

    # ── Run prediction ───────────────────────────────────────────────────── #
    try:
        predictions = predictor.predict(beach, weather)
    except Exception as exc:
        traceback.print_exc()
        return _err(f"Prediction failed: {str(exc)}", 500)

    return _ok(
        {
            "predictions": predictions,
            "beachId":     beach.get("id"),
            "beachName":   beach.get("name"),
            "modelUsed":   "random-forest" if predictor.model_loaded else "rules-based",
        },
        "Prediction generated successfully",
    )


@app.route("/train", methods=["POST"])
def train():
    """
    Trigger model retraining.
    Protected by a simple shared-secret header: X-Train-Secret.

    The train.py script is imported and run inline so Flask doesn't need
    to spawn a subprocess. For large datasets, consider running train.py
    as a background task with Celery or a simple thread.
    """
    # Simple auth guard
    secret = request.headers.get("X-Train-Secret", "")
    if secret != TRAIN_SECRET:
        return _err("Forbidden — invalid X-Train-Secret header", 403)

    try:
        # Import and run training inline
        import train as train_module  # noqa: F401
        result = train_module.run_training()

        # Hot-reload models into the running predictor singleton
        predictor.reload_models()

        return _ok(result, "Model training completed, models hot-reloaded")
    except Exception as exc:
        traceback.print_exc()
        return _err(f"Training failed: {str(exc)}", 500)


# ── Entry point ──────────────────────────────────────────────────────────── #

if __name__ == "__main__":
    port = int(os.getenv("ML_SERVICE_PORT", 5001))
    debug = os.getenv("ML_DEBUG", "true").lower() == "true"
    print(f"[EcoShore ML] Starting on http://0.0.0.0:{port} — debug={debug}")
    print(f"[EcoShore ML] Model loaded: {predictor.model_loaded}")
    app.run(host="0.0.0.0", port=port, debug=debug)
