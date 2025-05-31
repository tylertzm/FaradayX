from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import sys
import re
import os
import json

# Set the TOKENIZERS_PARALLELISM environment variable to prevent warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"

app = Flask(__name__)
CORS(app, supports_credentials=True, allow_headers=["Content-Type", "Authorization", "X-Requested-With"], expose_headers=["Content-Type"], methods=["GET", "POST", "OPTIONS"])

def extract(pattern, text, cast=float, default=None):
    m = re.search(pattern, text)
    if m:
        try:
            return cast(m.group(1))
        except Exception:
            return default
    return default

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json()
    model_name = data.get('modelName', 'Qwen/Qwen3-0.6B')
    input_text = data.get('inputText', 'Hello, this is a test.')

    app_py_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.py")
    process = subprocess.Popen(
        [sys.executable, app_py_path],
        cwd=os.path.dirname(app_py_path),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate(f"{model_name}\n{input_text}\n")

    if process.returncode != 0:
        return jsonify({"error": "Backend app.py failed", "stderr": stderr, "stdout": stdout}), 500

    predicted_runtime = extract(r"\[ML Model\] Predicted runtime \(seconds\): ([0-9.]+)", stdout)
    actual_runtime = extract(r"Actual measured runtime \(seconds\): ([0-9.]+)", stdout)
    error = extract(r"Prediction error: ([0-9.]+)", stdout)
    energy_used = extract(r"Estimated energy used: ([0-9.]+)", stdout)
    auction_price = extract(r"Auction price used: ([0-9.]+)", stdout)
    cost_cents = extract(r"Predicted cost of inference: ([0-9.]+) cents", stdout)
    cost_eur = extract(r"Predicted cost of inference: [0-9.]+ cents \(([0-9.]+) EUR\)", stdout)
    
    # Extract power information
    avg_power = extract(r"avg_power = ([0-9.]+)", stdout)
    if avg_power is None:
        # Try another pattern that might appear in the output
        avg_power = extract(r"average power: ([0-9.]+)W", stdout)
    
    # Calculate actual cost if we have energy and price
    actual_cost_eur = None
    if energy_used is not None and auction_price is not None:
        # Convert Wh to kWh and multiply by EUR/MWh/1000
        actual_cost_eur = (energy_used / 1000) * (auction_price / 1000)
        # Convert to cents
        actual_cost_cents = actual_cost_eur * 100

    # Get hardware info
    try:
        hardware_result = subprocess.check_output([
            sys.executable, os.path.join(os.path.dirname(__file__), 'extract_hardware_features.py')
        ])
        hardware_info = json.loads(hardware_result.decode()) if hardware_result else {}
    except Exception:
        hardware_info = {}
    # Get model info
    try:
        model_result = subprocess.check_output([
            sys.executable, os.path.join(os.path.dirname(__file__), 'extract_model_features.py'), model_name, input_text
        ])
        model_info = json.loads(model_result.decode()) if model_result else {}
    except Exception:
        model_info = {}

    price_history, price_future = [], []
    try:
        with open(os.path.join(os.path.dirname(__file__), "data.csv"), "r") as f:
            import csv
            reader = csv.DictReader(f)
            for row in reader:
                entry = {
                    "datetime": row["datetime"],
                    "price_eur_per_mwh": float(row["price_eur_per_mwh"]),
                }
                if row.get("is_future") == "1":
                    price_future.append(entry)
                else:
                    price_history.append(entry)
    except Exception:
        price_history = []
        price_future = []

    return jsonify({
        'predictedRuntime': predicted_runtime,
        'energyUsed': energy_used,
        'auctionPrice': auction_price,
        'costEur': cost_eur,
        'costCents': cost_cents,
        'actualRuntime': actual_runtime,
        'error': error,
        'predictedPower': avg_power,
        'actualPower': None,  # For now, we don't have actual power measurement
        'actualCostEur': actual_cost_eur,
        'actualCostCents': actual_cost_eur * 100 if actual_cost_eur else None,
        'raw': stdout,
        'stderr': stderr,
        'hardware': hardware_info,
        'model': model_info,
        'priceHistory': price_history,
        'priceFuture': price_future
    })

@app.route('/api/hardware', methods=['GET'])
def hardware_info():
    try:
        result = subprocess.check_output([sys.executable, os.path.join(os.path.dirname(__file__), 'extract_hardware_features.py')])
        features = json.loads(result.decode()) if result else {}
        print("[HARDWARE FEATURES API CALL]", json.dumps(features, indent=2), flush=True)
        return jsonify(features)
    except Exception as e:
        print(f"[HARDWARE FEATURES API ERROR] {e}", flush=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/model', methods=['POST'])
def model_info():
    data = request.get_json(force=True)
    model_name = data.get('modelName', 'Qwen/Qwen3-0.6B')
    input_text = data.get('inputText', 'Hello, this is a test.')
    try:
        result = subprocess.check_output([
            sys.executable, os.path.join(os.path.dirname(__file__), 'extract_model_features.py'), model_name, input_text
        ])
        features = json.loads(result.decode()) if result else {}
        print("[MODEL FEATURES API CALL]", json.dumps(features, indent=2), flush=True)
        return jsonify(features)
    except Exception as e:
        print(f"[MODEL FEATURES API ERROR] {e}", flush=True)
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)

