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
from extract_model_features import extract_model_features
from extract_hardware_features import extract_hardware_features
from transformers import AutoTokenizer

# Set the TOKENIZERS_PARALLELISM environment variable to prevent warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"

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

        # Ensure tokenizer has distinct pad token
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
            tokenizer.pad_token_id = tokenizer.eos_token_id

        input_text = input("Enter example input text (or leave blank for default): ").strip() or "Hello, this is a test."

        # Properly tokenize with attention mask
        inputs = tokenizer(
            input_text,
            padding=True,
            return_tensors="pt",
            truncation=True,
            return_attention_mask=True
        )

        # Pass both input_ids and attention_mask to the model
        example_input = inputs["input_ids"]
        model_features = extract_model_features(model, example_input, attention_mask=inputs["attention_mask"])
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
        if y_pred is None:
            print("\n[Heuristic] Could not predict runtime - missing required features")
            return
        print(f"\n[Heuristic] Predicted runtime (seconds): {y_pred:.4f}")

    # --- Cost Prediction Section ---
    # Estimate average power (W). Try to get from hardware features, then from CSV data, then default
    try:
        # First try to get from hardware features
        avg_power = float(features.get("avg_cpu_power", 0))

        # If not available, try to get average from benchmark data
        if avg_power == 0:
            try:
                df = pd.read_csv("data/benchmarks.csv")
                if not df.empty:
                    # Get average CPU power from existing benchmarks
                    avg_cpu_power = df["avg_cpu_power"].mean()
                    avg_gpu_power = df["avg_gpu_power"].mean()
                    avg_power = avg_cpu_power + avg_gpu_power  # Total average power
                    print(f"Using benchmark average power: CPU={avg_cpu_power:.3f}W + GPU={avg_gpu_power:.3f}W = {avg_power:.3f}W")
            except Exception as e:
                print(f"[WARN] Could not load benchmark power data: {e}")
                avg_power = 0

        # Final fallback to default
        if avg_power == 0:
            avg_power = 30
            print(f"Using default power: {avg_power}W")

    except Exception:
        avg_power = 30
        print(f"Using fallback default power: {avg_power}W")
    # Energy used (kWh)
    energy_used_kwh = (y_pred * avg_power) / 3600  # seconds * W / 3600 = kWh

    # Print average power for server extraction
    print(f"avg_power = {avg_power:.2f}")

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
        _ = model(example_input, attention_mask=inputs["attention_mask"])
        end = time.time()
    actual_runtime = end - start
    print(f"Actual measured runtime (seconds): {actual_runtime:.4f}")
    print(f"Prediction error: {abs(y_pred - actual_runtime) / actual_runtime * 100:.2f}%")
    # Optionally: print power estimate if available
    # (Extend here if you train a power estimator)

    # After printing extracted features, also print input/output token lengths in a way that the Flask API can parse from stdout
    print(f"Input token length: {features.get('input_token_length', 0)}")
    print(f"Output token length: {features.get('output_token_length', 0)}")

if __name__ == "__main__":
    main()
