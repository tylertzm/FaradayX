import platform
import subprocess
import re
import json
import psutil

def get_cpu_frequency():
    try:
        # Get CPU frequency using psutil
        freq = psutil.cpu_freq()
        if freq and freq.current:
            return int(freq.current * 1e6)  # Convert MHz to Hz
    except Exception:
        pass
    # Fallback: return a reasonable default
    return 3_100_000_000  # 3.1 GHz in Hz

def extract_hardware_features():
    features = {
        "device": platform.processor(),
        "num_cores": psutil.cpu_count(logical=True),
        "cpu_frequency": get_cpu_frequency(),
        "memory_bytes": psutil.virtual_memory().total,
        "os": platform.system(),
        "os_version": platform.version(),
        "machine": platform.machine(),
        "gpu_available": False,
    }

    # Check for GPU using nvidia-smi on Windows
    try:
        nvidia_smi = subprocess.check_output(["nvidia-smi"], stderr=subprocess.STDOUT)
        if b"NVIDIA" in nvidia_smi:
            features["gpu_available"] = True
    except Exception:
        pass

    return features

if __name__ == "__main__":
    print(json.dumps(extract_hardware_features()))
