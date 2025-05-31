"""
app.py: Predict runtime and/or power consumption of an AI model on specific hardware.
- Loads model and hardware features from user input or files
- Uses trained estimator (if available) or heuristic
- Prints prediction results
"""
import json
import os
import sys
import pandas as pd
import subprocess
from extract_model_features import extract_model_features
from extract_hardware_features import extract_hardware_features

# Run energy price simulation to generate data.csv before anything else
subprocess.run([sys.executable, 'energy_price_simulation.py'])

# Try to load estimator
try:
    import joblib
    estimator = joblib.load("runtime_predictor.pkl")
    use_ml = True
except Exception:
    estimator = None
    use_ml = False

def heuristic_predict(features):
    # Simple heuristic: runtime = flops / (cpu_frequency * num_cores)
    try:
        flops = float(features.get("flops", 0))
        cpu_freq = float(features.get("cpu_frequency", 1))
        num_cores = float(features.get("num_cores", 1))
        ineff = 2.0
        return flops / (cpu_freq * num_cores) * ineff
    except Exception:
        return None

def main():
    print("=== AI Inference Runtime & Power Predictor ===")
    # Get model path or HuggingFace name
    model_name = input("Enter HuggingFace model name (e.g. Qwen/Qwen3-0.6B): ").strip()
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch
        model = AutoModelForCausalLM.from_pretrained(model_name)
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        input_text = input("Enter example input text (or leave blank for default): ").strip() or "Hello, this is a test."
        inputs = tokenizer(input_text, return_tensors="pt")
        example_input = inputs["input_ids"]
        model_features = extract_model_features(model, example_input)
    except Exception as e:
        print(f"[ERROR] Could not load model: {e}")
        return
    # Get hardware features
    hardware_features = extract_hardware_features()
    # Merge features
    features = {**model_features, **hardware_features}
    # Print extracted features
    print("\nExtracted Features:")
    print(json.dumps(features, indent=2))
    # Extract batch_size, sequence_length, input_size
    batch_size = int(example_input.shape[0]) if hasattr(example_input, 'shape') else 1
    sequence_length = int(example_input.shape[1]) if hasattr(example_input, 'shape') and len(example_input.shape) > 1 else 0
    input_size = sequence_length  # For text models, input_size can be sequence_length
    # Prepare input for estimator
    feature_cols = ["num_params", "flops", "num_layers", "cpu_frequency", "num_cores", "sequence_length", "batch_size", "input_size"]
    X = pd.DataFrame([{col: features.get(col, 0) for col in feature_cols}])
    X["batch_size"] = batch_size
    X["sequence_length"] = sequence_length
    X["input_size"] = input_size
    # Predict
    if use_ml:
        y_pred = estimator.predict(X)[0]
        print(f"\n[ML Model] Predicted runtime (seconds): {y_pred:.4f}")
    else:
        y_pred = heuristic_predict(features)
        print(f"\n[Heuristic] Predicted runtime (seconds): {y_pred:.4f}")

    # --- Cost Prediction Section ---
    # Estimate average power (W). If you have a power estimator, use it. Otherwise, use a default or ask user.
    try:
        avg_power = float(features.get("avg_cpu_power", 30))  # Try to get from features, else default 30W
        if avg_power == 0:
            avg_power = 30
    except Exception:
        avg_power = 30
    # Energy used (kWh)
    energy_used_kwh = (y_pred * avg_power) / 3600  # seconds * W / 3600 = kWh
    # Load latest auction price from data.csv (EUR/MWh)
    import csv
    auction_price_eur_per_mwh = None
    try:
        with open("data.csv", "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("is_future") == "1":
                    auction_price_eur_per_mwh = float(row["price_eur_per_mwh"])
                    break  # Take the first future price (soonest auction)
        if auction_price_eur_per_mwh is None:
            # Fallback: use last historical price
            with open("data.csv", "r") as f:
                rows = list(csv.DictReader(f))
                if rows:
                    auction_price_eur_per_mwh = float(rows[-1]["price_eur_per_mwh"])
    except Exception as e:
        print(f"[WARN] Could not load auction price: {e}")
        auction_price_eur_per_mwh = 80  # fallback default
    auction_price_eur_per_kwh = auction_price_eur_per_mwh / 1000
    cost_eur = energy_used_kwh * auction_price_eur_per_kwh
    print(f"\nEstimated energy used: {energy_used_kwh*1000:.2f} Wh")
    print(f"Auction price used: {auction_price_eur_per_mwh:.2f} EUR/MWh ({auction_price_eur_per_kwh:.4f} EUR/kWh)")
    print(f"Predicted cost of inference: {cost_eur*1000:.4f} cents ({cost_eur:.6f} EUR)")
    # --- End Cost Prediction Section ---

    # Run actual inference and time it
    import time
    with torch.no_grad():
        start = time.time()
        _ = model(example_input)
        end = time.time()
    actual_runtime = end - start
    print(f"Actual measured runtime (seconds): {actual_runtime:.4f}")
    print(f"Prediction error: {abs(y_pred - actual_runtime) / actual_runtime * 100:.2f}%")
    # Optionally: print power estimate if available
    # (Extend here if you train a power estimator)

if __name__ == "__main__":
    main()
