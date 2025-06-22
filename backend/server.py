from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import sys
import re
import os
import json
import sqlite3
from datetime import datetime, timedelta
import uuid
import threading
import time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from api_pipeline_info import api_pipeline_info

# Set the TOKENIZERS_PARALLELISM environment variable to prevent warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"

app = Flask(__name__)
CORS(app, origins=["https://your-site.netlify.app"], supports_credentials=True, allow_headers=["Content-Type", "Authorization", "X-Requested-With"], expose_headers=["Content-Type"], methods=["GET", "POST", "OPTIONS", "DELETE", "PUT"])
app.register_blueprint(api_pipeline_info)

# Initialize SQLite database for scheduled jobs
def init_db():
    conn = sqlite3.connect('scheduler.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scheduled_jobs (
            id TEXT PRIMARY KEY,
            model_name TEXT NOT NULL,
            input_text TEXT NOT NULL,
            scheduled_time TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            estimated_cost REAL,
            estimated_runtime REAL,
            estimated_energy REAL,
            energy_price REAL,
            result_json TEXT,
            created_at TEXT NOT NULL,
            completed_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

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
    print("[DEBUG] Starting prediction request...")
    data = request.get_json()
    model_name = data.get('modelName', 'Qwen/Qwen3-0.6B')
    input_text = data.get('inputText', 'Hello, this is a test.')

    print(f"[DEBUG] Model name: {model_name}")
    print(f"[DEBUG] Input text: {input_text}")

    app_py_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.py")
    print(f"[DEBUG] App.py path: {app_py_path}")

    try:
        process = subprocess.Popen(
            [sys.executable, app_py_path],
            cwd=os.path.dirname(app_py_path),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        print("[DEBUG] Subprocess started")

        stdout, stderr = process.communicate(f"{model_name}\n{input_text}\n")
        print(f"[DEBUG] Process return code: {process.returncode}")
        print(f"[DEBUG] stdout: {stdout}")
        print(f"[DEBUG] stderr: {stderr}")

        if process.returncode != 0:
            print("[ERROR] Backend app.py failed")
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
            # Convert Wh to kWh and multiply to get cost in EUR
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
            # Guarantee input_token_length and output_token_length are present and integers
            if not isinstance(model_info.get("input_token_length"), int):
                model_info["input_token_length"] = int(model_info.get("input_token_length", 0) or 0)
            if not isinstance(model_info.get("output_token_length"), int):
                model_info["output_token_length"] = int(model_info.get("output_token_length", 0) or 0)
        except Exception:
            model_info = {"input_token_length": 0, "output_token_length": 0}

        # Extract input/output token lengths from the app.py stdout if present
        input_token_length = extract(r"Input token length: (\d+)", stdout, cast=int, default=None)
        output_token_length = extract(r"Output token length: (\d+)", stdout, cast=int, default=None)
        # If found, override/add to model_info
        if input_token_length is not None:
            model_info["input_token_length"] = input_token_length
        if output_token_length is not None:
            model_info["output_token_length"] = output_token_length

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
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        # Guarantee input_token_length and output_token_length are present and integers
        if not isinstance(features.get("input_token_length"), int):
            features["input_token_length"] = int(features.get("input_token_length", 0) or 0)
        if not isinstance(features.get("output_token_length"), int):
            features["output_token_length"] = int(features.get("output_token_length", 0) or 0)
        print("[MODEL FEATURES API CALL]", json.dumps(features, indent=2), flush=True)
        return jsonify(features)
    except Exception as e:
        print(f"[MODEL FEATURES API ERROR] {e}", flush=True)
        return jsonify({'error': str(e)}), 500

# Scheduler API endpoints
@app.route('/api/scheduler/jobs', methods=['GET'])
def get_scheduled_jobs():
    try:
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, model_name, input_text, scheduled_time, status,
                   estimated_cost, estimated_runtime, estimated_energy, energy_price,
                   result_json, created_at, completed_at
            FROM scheduled_jobs
            ORDER BY scheduled_time ASC
        ''')
        rows = cursor.fetchall()
        conn.close()

        jobs = []
        for row in rows:
            job = {
                'id': row[0],
                'modelName': row[1],
                'inputText': row[2],
                'scheduledTime': row[3],
                'status': row[4],
                'estimatedCost': row[5],
                'estimatedRuntime': row[6],
                'estimatedEnergy': row[7],
                'energyPrice': row[8],
                'result': json.loads(row[9]) if row[9] else None,
                'createdAt': row[10],
                'completedAt': row[11]
            }
            jobs.append(job)

        return jsonify(jobs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scheduler/jobs', methods=['POST'])
def schedule_job():
    try:
        data = request.get_json()

        job_id = str(uuid.uuid4())
        model_name = data.get('modelName', '')
        input_text = data.get('inputText', '')
        scheduled_time = data.get('scheduledTime', '')
        estimated_cost = data.get('estimatedCost')
        estimated_runtime = data.get('estimatedRuntime')
        estimated_energy = data.get('estimatedEnergy')
        energy_price = data.get('energyPrice')
        created_at = datetime.now().isoformat()

        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO scheduled_jobs
            (id, model_name, input_text, scheduled_time, estimated_cost,
             estimated_runtime, estimated_energy, energy_price, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (job_id, model_name, input_text, scheduled_time, estimated_cost,
              estimated_runtime, estimated_energy, energy_price, created_at))
        conn.commit()
        conn.close()

        return jsonify({
            'id': job_id,
            'message': 'Job scheduled successfully'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scheduler/jobs/<job_id>', methods=['DELETE'])
def delete_scheduled_job(job_id):
    try:
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM scheduled_jobs WHERE id = ?', (job_id,))
        conn.commit()
        affected_rows = cursor.rowcount
        conn.close()

        if affected_rows == 0:
            return jsonify({'error': 'Job not found'}), 404

        return jsonify({'message': 'Job deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scheduler/jobs/<job_id>/run', methods=['POST'])
def run_scheduled_job(job_id):
    try:
        # Get job details
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT model_name, input_text FROM scheduled_jobs
            WHERE id = ? AND status = 'pending'
        ''', (job_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({'error': 'Job not found or already completed'}), 404

        model_name, input_text = row

        # Update status to running
        cursor.execute('''
            UPDATE scheduled_jobs SET status = 'running' WHERE id = ?
        ''', (job_id,))
        conn.commit()
        conn.close()

        # Run the prediction
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

        # Parse results
        predicted_runtime = extract(r"\[ML Model\] Predicted runtime \(seconds\): ([0-9.]+)", stdout)
        actual_runtime = extract(r"Actual measured runtime \(seconds\): ([0-9.]+)", stdout)
        error = extract(r"Prediction error: ([0-9.]+)", stdout)
        energy_used = extract(r"Estimated energy used: ([0-9.]+)", stdout)
        auction_price = extract(r"Auction price used: ([0-9.]+)", stdout)
        cost_cents = extract(r"Predicted cost of inference: ([0-9.]+) cents", stdout)
        cost_eur = extract(r"Predicted cost of inference: [0-9.]+ cents \(([0-9.]+) EUR\)", stdout)
        avg_power = extract(r"avg_power = ([0-9.]+)", stdout)

        # Get hardware and model info
        try:
            hardware_result = subprocess.check_output([
                sys.executable, os.path.join(os.path.dirname(__file__), 'extract_hardware_features.py')
            ])
            hardware_info = json.loads(hardware_result.decode()) if hardware_result else {}
        except Exception:
            hardware_info = {}

        try:
            model_result = subprocess.check_output([
                sys.executable, os.path.join(os.path.dirname(__file__), 'extract_model_features.py'), model_name, input_text
            ])
            model_info = json.loads(model_result.decode()) if model_result else {}
        except Exception:
            model_info = {}

        # Get price data
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

        # Prepare result
        result = {
            'predictedRuntime': predicted_runtime,
            'energyUsed': energy_used,
            'auctionPrice': auction_price,
            'costEur': cost_eur,
            'costCents': cost_cents,
            'actualRuntime': actual_runtime,
            'error': error,
            'predictedPower': avg_power,
            'actualPower': None,
            'actualCostEur': (energy_used / 1000) * (auction_price / 1000) if energy_used and auction_price else None,
            'actualCostCents': ((energy_used / 1000) * (auction_price / 1000) * 100) if energy_used and auction_price else None,
            'raw': stdout,
            'stderr': stderr,
            'hardware': hardware_info,
            'model': model_info,
            'priceHistory': price_history,
            'priceFuture': price_future
        }

        # Update job with results
        conn = sqlite3.connect('scheduler.db')
        cursor = conn.cursor()

        if process.returncode == 0:
            cursor.execute('''
                UPDATE scheduled_jobs
                SET status = 'completed', result_json = ?, completed_at = ?
                WHERE id = ?
            ''', (json.dumps(result), datetime.now().isoformat(), job_id))
        else:
            cursor.execute('''
                UPDATE scheduled_jobs
                SET status = 'failed', result_json = ?, completed_at = ?
                WHERE id = ?
            ''', (json.dumps({'error': stderr, 'stdout': stdout}), datetime.now().isoformat(), job_id))

        conn.commit()
        conn.close()

        if process.returncode == 0:
            return jsonify(result)
        else:
            return jsonify({'error': 'Job execution failed', 'stderr': stderr}), 500

    except Exception as e:
        # Mark job as failed
        try:
            conn = sqlite3.connect('scheduler.db')
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE scheduled_jobs
                SET status = 'failed', completed_at = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), job_id))
            conn.commit()
            conn.close()
        except:
            pass

        return jsonify({'error': str(e)}), 500

@app.route('/api/scheduler/energy-price/<timestamp>', methods=['GET'])
def get_energy_price_for_time(timestamp):
    try:
        # Parse timestamp - handle both Unix timestamp and ISO format
        try:
            # Try Unix timestamp first (milliseconds)
            timestamp_ms = int(timestamp)
            target_time = datetime.fromtimestamp(timestamp_ms / 1000)
        except ValueError:
            # Fallback to ISO format
            target_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

        # Read price data
        try:
            with open(os.path.join(os.path.dirname(__file__), "data.csv"), "r") as f:
                import csv
                reader = csv.DictReader(f)
                closest_price = None
                min_diff = float('inf')

                for row in reader:
                    try:
                        row_time = datetime.fromisoformat(row["datetime"])
                        diff = abs((target_time - row_time).total_seconds())

                        if diff < min_diff:
                            min_diff = diff
                            closest_price = float(row["price_eur_per_mwh"])
                    except Exception as parse_error:
                        continue  # Skip invalid rows

                if closest_price is not None:
                    return jsonify({
                        'timestamp': timestamp,
                        'price': closest_price,  # Use 'price' for consistency with frontend
                        'priceEurPerMwh': closest_price,
                        'priceEurPerKwh': closest_price / 1000
                    })
        except Exception as e:
            print(f"Error reading price data: {e}")

        # Fallback to default price
        fallback_price = 85.2  # Use the same fallback as in frontend
        return jsonify({
            'timestamp': timestamp,
            'price': fallback_price,
            'priceEurPerMwh': fallback_price,
            'priceEurPerKwh': fallback_price / 1000
        })

    except Exception as e:
        print(f"Energy price API error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
