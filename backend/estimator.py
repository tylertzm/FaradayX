import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os
import math
import json

DATA_PATH = "data/benchmarks.csv"
MODEL_PATH = "runtime_predictor.pkl"

# Add token/input related features here
FEATURE_COLS = [
    "num_params", "flops", "num_layers", "cpu_frequency", "num_cores",
    "sequence_length", "batch_size", "input_size"
]

TARGET = "inference_time"

def train_estimator():
    # Load data, ignore comment lines
    df = pd.read_csv(DATA_PATH, comment="#")

    # Drop rows with missing values in features or target
    df = df.dropna(subset=FEATURE_COLS + [TARGET])

    # Fill NaNs in features with 0 (if any remain)
    X = df[FEATURE_COLS].fillna(0)
    y = df[TARGET]

    # Split train/test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Cross-validation
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    reg_cv = RandomForestRegressor(n_estimators=100, random_state=42)
    cv_scores = cross_val_score(reg_cv, X, y, cv=kf, scoring="neg_mean_absolute_error")
    print(f"Cross-validated MAE (5-fold): {abs(np.mean(cv_scores)):.4f} ± {np.std(cv_scores):.4f}")

    # Train model
    reg = RandomForestRegressor(n_estimators=100, random_state=42)
    reg.fit(X_train, y_train)

    # Predict on test set
    y_pred = reg.predict(X_test)

    # Evaluate
    mae = mean_absolute_error(y_test, y_pred)
    rmse = math.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f"MAE: {mae:.4f}, RMSE: {rmse:.4f}, R2: {r2:.4f}")

    # Save model
    joblib.dump(reg, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    # Save feature importances
    importances = dict(zip(FEATURE_COLS, reg.feature_importances_))
    os.makedirs("results", exist_ok=True)
    with open("results/feature_importance.json", "w") as f:
        json.dump(importances, f, indent=2)
    print("Feature importances saved to results/feature_importance.json")


if __name__ == "__main__":
    train_estimator()