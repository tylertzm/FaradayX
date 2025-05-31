import time
import csv
import os
import subprocess
import random
import torch
import json
from backend.extract_model_features import extract_model_features
from backend.extract_hardware_features import extract_hardware_features
from transformers import AutoModelForCausalLM, AutoTokenizer

# Suppress the parallelism warning from HuggingFace tokenizers
os.environ["TOKENIZERS_PARALLELISM"] = "false"

MODEL_NAME = "Qwen/Qwen3-0.6B"
CSV_PATH = "data/benchmarks.csv"
N_RUNS = 100  # Adjust as needed
MAX_NEW_TOKENS = 512  # Number of tokens to generate

# Load prompts from prompts_dataset.json
PROMPTS_PATH = "prompts_dataset.json"
with open(PROMPTS_PATH, "r", encoding="utf-8") as f:
    PROMPTS = json.load(f)

def get_power_metrics():
    try:
        result = subprocess.run(
            ["sudo", "powermetrics", "-n", "1"],
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout
        power_lines = [line for line in output.splitlines() if "mW" in line]

        cpu_power_mw = 0
        gpu_power_mw = 0
        for line in power_lines:
            if "CPU Power" in line:
                cpu_power_mw = float(line.split(":")[1].strip().split()[0])
            elif "GPU Power" in line:
                gpu_power_mw = float(line.split(":")[1].strip().split()[0])
        return {
            "avg_cpu_power": cpu_power_mw / 1000,  # mW to W
            "avg_gpu_power": gpu_power_mw / 1000
        }
    except Exception as e:
        print(f"[WARN] powermetrics failed: {e}")
        return {"avg_cpu_power": 0, "avg_gpu_power": 0}

def main():
    os.makedirs("data", exist_ok=True)

    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    # Warmup to avoid initialization overheads during timing
    warmup_input = tokenizer("Warmup input", return_tensors="pt")["input_ids"]
    with torch.no_grad():
        _ = model(warmup_input)

    hardware_features = extract_hardware_features()
    # Use a sample input for model features extraction
    example_input = tokenizer("Hello, this is a test.", return_tensors="pt")["input_ids"]
    model_features = extract_model_features(model, example_input)

    fieldnames = [
        "model", "model_architecture", "num_params", "flops", "num_layers", "device",
        "num_cores", "cpu_frequency", "batch_size", "inference_time", "output_generation_time",
        "output_token_count", "avg_cpu_power", "avg_gpu_power", "peak_power",
        "input_text", "input_size", "sequence_length", "tokens"
    ]

    write_header = not os.path.exists(CSV_PATH) or os.stat(CSV_PATH).st_size == 0

    with open(CSV_PATH, "a", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()

        for i in range(N_RUNS):
            # Use a unique prompt from the JSON file, cycling if N_RUNS > len(PROMPTS)
            input_text = PROMPTS[i % len(PROMPTS)]
            inputs = tokenizer(input_text, return_tensors="pt")
            input_ids = inputs["input_ids"]

            print(f"Run {i+1}/{N_RUNS} input text: {input_text}")

            batch_size = input_ids.shape[0]

            # Measure inference (forward pass) time
            start = time.time()
            with torch.no_grad():
                outputs = model(input_ids)
            end = time.time()
            inference_time = end - start

            # Measure generation time and get generated tokens
            gen_start = time.time()
            generated_ids = model.generate(input_ids, max_new_tokens=MAX_NEW_TOKENS)
            gen_end = time.time()
            output_generation_time = gen_end - gen_start
            output_token_count = generated_ids.shape[1]

            power = get_power_metrics()

            token_list = input_ids[0].tolist()

            row = {
                "model": MODEL_NAME,
                "model_architecture": type(model).__name__,
                "num_params": model_features["num_params"],
                "flops": model_features["flops"],
                "num_layers": model_features["num_layers"],
                "device": hardware_features["device"],
                "num_cores": hardware_features["num_cores"],
                "cpu_frequency": hardware_features["cpu_frequency"] / 1e9,  # Hz to GHz
                "batch_size": batch_size,
                "inference_time": inference_time,
                "output_generation_time": output_generation_time,
                "output_token_count": output_token_count,
                "avg_cpu_power": power["avg_cpu_power"],
                "avg_gpu_power": power["avg_gpu_power"],
                "peak_power": max(power["avg_cpu_power"], power["avg_gpu_power"]),
                "input_text": input_text,
                "input_size": input_ids.numel(),
                "sequence_length": input_ids.shape[1],
                "tokens": ",".join(map(str, token_list))
            }

            writer.writerow(row)
            print(
                f"Run {i+1}/{N_RUNS} complete: "
                f"inference_time={inference_time:.4f}s, "
                f"generation_time={output_generation_time:.4f}s, "
                f"output_tokens={output_token_count}, "
                f"CPU_power={power['avg_cpu_power']:.2f}W, "
                f"GPU_power={power['avg_gpu_power']:.2f}W"
            )

if __name__ == "__main__":
    main()