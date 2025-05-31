    # api_pipeline_info.py
"""
API endpoint to aggregate and serve pipeline/log/data/results information for frontend visualization.
"""
from flask import Flask, jsonify, send_file
import os
import json
import glob
import pandas as pd

from flask import Blueprint

api_pipeline_info = Blueprint('api_pipeline_info', __name__)

BACKEND_ROOT = os.path.dirname(os.path.abspath(__file__))

@api_pipeline_info.route('/api/pipeline/info', methods=['GET'])
def pipeline_info():
    # Logs
    logs_dir = os.path.join(BACKEND_ROOT, 'logs')
    log_files = sorted(glob.glob(os.path.join(logs_dir, '*.log')))
    logs = {}
    for log_file in log_files:
        with open(log_file, 'r') as f:
            logs[os.path.basename(log_file)] = f.read()

    # Data
    data_dir = os.path.join(BACKEND_ROOT, 'data')
    data_files = sorted(glob.glob(os.path.join(data_dir, '*.csv')))
    data = {}
    for data_file in data_files:
        try:
            df = pd.read_csv(data_file)
            data[os.path.basename(data_file)] = df.head(100).to_dict(orient='records')
        except Exception as e:
            data[os.path.basename(data_file)] = f"Error reading: {e}"

    # Results
    results_dir = os.path.join(BACKEND_ROOT, 'results')
    results = {}
    for fname in ['evaluation_report.json', 'feature_importance.json']:
        fpath = os.path.join(results_dir, fname)
        if os.path.exists(fpath):
            with open(fpath, 'r') as f:
                try:
                    results[fname] = json.load(f)
                except Exception as e:
                    results[fname] = f"Error reading: {e}"

    # Add evaluation plot as a downloadable file
    plot_path = os.path.join(results_dir, 'evaluation_plots.png')
    plot_url = None
    if os.path.exists(plot_path):
        plot_url = '/api/pipeline/eval_plot'

    return jsonify({
        'logs': logs,
        'data': data,
        'results': results,
        'plot_url': plot_url
    })

@api_pipeline_info.route('/api/pipeline/eval_plot', methods=['GET'])
def pipeline_eval_plot():
    plot_path = os.path.join(BACKEND_ROOT, 'results', 'evaluation_plots.png')
    if os.path.exists(plot_path):
        return send_file(plot_path, mimetype='image/png')
    return ('', 404)
