import platform
import subprocess
import re
import json

def get_sysctl_value(key):
    try:
        return subprocess.check_output(["sysctl", "-n", key]).decode().strip()
    except Exception:
        return None

def get_cpu_frequency():
    freq = get_sysctl_value("hw.cpufrequency")
    if freq and int(freq) != 0:
        return int(freq)
    # Fallback: parse from system_profiler
    try:
        sp_output = subprocess.check_output(["system_profiler", "SPHardwareDataType"]).decode()
        match = re.search(r"Processor Speed: ([\d\.]+) GHz", sp_output)
        if match:
            ghz = float(match.group(1))
            return int(ghz * 1e9)  # Convert GHz to Hz
    except Exception:
        pass
    # Last fallback: return 0 or a hardcoded frequency in Hz
    return 3_100_000_000  # e.g., 3.1 GHz in Hz

def extract_hardware_features():
    features = {
        "device": get_sysctl_value("machdep.cpu.brand_string") or platform.machine(),
        "num_cores": int(get_sysctl_value("hw.ncpu") or 0),
        "cpu_frequency": get_cpu_frequency(),
        "memory_bytes": int(get_sysctl_value("hw.memsize") or 0),
        "os": platform.system(),
        "os_version": platform.version(),
        "machine": platform.machine(),
        "gpu_available": False,
    }
    try:
        gpu_info = subprocess.check_output(["system_profiler", "SPDisplaysDataType"]).decode()
        if any(x in gpu_info for x in ["Apple", "AMD", "NVIDIA"]):
            features["gpu_available"] = True
    except Exception:
        pass
    return features

if __name__ == "__main__":
    print(json.dumps(extract_hardware_features()))