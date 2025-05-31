"""
Evaluation script to compare ML estimator vs heuristic model for inference time prediction.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json
import os
import math
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ESTIMATOR_PATH = "runtime_predictor.pkl"
DATA_PATH = "data/benchmarks.csv"
PLOT_PATH = "results/evaluation_plots.png"
REPORT_PATH = "results/evaluation_report.json"

# Try to load ML estimator if available
try:
    import joblib
    estimator = joblib.load(ESTIMATOR_PATH)
    use_ml = True
    print("[INFO] ML estimator loaded successfully.")
except Exception as e:
    estimator = None
    use_ml = False
    print(f"[INFO] ML estimator not found or failed to load: {e}")
    print("[INFO] Using heuristic model instead.")

def heuristic_predict(row):
    try:
        flops = float(row.get("flops", 0))
        cpu_freq_ghz = float(row.get("cpu_frequency", 1))
        num_cores = float(row.get("num_cores", 1))
        inefficiency_factor = 2.0  # empirically determined inefficiency factor
        cpu_freq_hz = cpu_freq_ghz * 1e9  # GHz to Hz
        if cpu_freq_hz == 0 or num_cores == 0:
            return np.nan
        return flops / (cpu_freq_hz * num_cores) * inefficiency_factor
    except Exception:
        return np.nan

def main():
    # Ensure results directory exists
    os.makedirs("results", exist_ok=True)

    # Load dataset
    df = pd.read_csv(DATA_PATH)

    # Drop rows missing target inference_time
    df = df.dropna(subset=["inference_time"])

    # Define features for ML model
    feature_cols = [
        "num_params", "flops", "num_layers", "cpu_frequency", "num_cores",
        "sequence_length", "batch_size", "input_size"
    ]

    # Prepare input for prediction
    X = df[feature_cols].fillna(0)
    y_true = df["inference_time"]

    # Predict using ML estimator or heuristic
    if use_ml:
        y_pred = estimator.predict(X)
    else:
        y_pred = df.apply(heuristic_predict, axis=1)

    # Evaluation metrics
    mae = mean_absolute_error(y_true, y_pred)
    rmse = math.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    corr = np.corrcoef(y_true, y_pred)[0, 1]

    # Plot Actual vs Predicted
    plt.figure(figsize=(6, 6))
    plt.scatter(y_true, y_pred, alpha=0.7, edgecolors='k')
    plt.plot([y_true.min(), y_true.max()], [y_true.min(), y_true.max()], 'r--')
    plt.xlabel("Actual Runtime (s)")
    plt.ylabel("Predicted Runtime (s)")
    plt.title("Actual vs. Predicted Inference Runtime")
    plt.tight_layout()
    plt.savefig(PLOT_PATH)
    plt.close()

    # Prepare report
    report = {
        "mae": mae,
        "rmse": rmse,
        "r2": r2,
        "correlation": corr,
        "plot": PLOT_PATH,
        "model_used": "ML estimator" if use_ml else "heuristic"
    }

    print(json.dumps(report, indent=2))

    # Save report
    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)

if __name__ == "__main__":
    main()