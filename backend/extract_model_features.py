"""
Extract features from a PyTorch model using thop.
"""
import torch
try:
    from thop import profile
except ImportError:
    profile = None

def extract_model_features(model, example_input, attention_mask=None):
    if profile is None:
        raise ImportError("Please install thop: pip install thop")

    # Pass attention mask to profile if available
    if attention_mask is not None:
        macs, params = profile(model, inputs=(example_input, attention_mask))
    else:
        macs, params = profile(model, inputs=(example_input,))

    # Count layers and types
    layer_types = {}
    num_layers = 0
    for m in model.modules():
        if m == model:
            continue
        t = type(m).__name__
        layer_types[t] = layer_types.get(t, 0) + 1
        num_layers += 1

    # Try to get output shape
    try:
        with torch.no_grad():
            if attention_mask is not None:
                output = model(example_input, attention_mask=attention_mask)
            else:
                output = model(example_input)
        output_shape = list(output.shape)
    except Exception:
        output_shape = None

    features = {
        "num_params": int(params),
        "flops": int(macs),
        "num_layers": num_layers,
        "layer_types": layer_types,
        "input_shape": list(example_input.shape),
        "output_shape": output_shape,
    }
    return features

if __name__ == "__main__":
    import sys
    import json
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    import warnings
    import logging
    import contextlib
    import io
    # Suppress all warnings and info logs for clean JSON output
    logging.getLogger().setLevel(logging.ERROR)
    warnings.filterwarnings("ignore")
    # Silence stdout/stderr from thop/torch
    f = io.StringIO()
    with contextlib.redirect_stdout(f), contextlib.redirect_stderr(f):
        model_name = sys.argv[1] if len(sys.argv) > 1 else "Qwen/Qwen3-0.6B"
        input_text = sys.argv[2] if len(sys.argv) > 2 else "Hello, this is a test."
        features = {}
        try:
            model = AutoModelForCausalLM.from_pretrained(model_name)
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            inputs = tokenizer(input_text, return_tensors="pt", padding=True, truncation=True)
            example_input = inputs["input_ids"]
            features = extract_model_features(model, example_input, attention_mask=inputs["attention_mask"])
            # Add extra fields for frontend compatibility
            features["model"] = model_name
            features["model_architecture"] = type(model).__name__
            features["batch_size"] = int(example_input.shape[0]) if hasattr(example_input, 'shape') else 1
            features["sequence_length"] = int(example_input.shape[1]) if hasattr(example_input, 'shape') and len(example_input.shape) > 1 else 0
            features["input_text"] = input_text
            features["input_size"] = features["sequence_length"]
            features["tokens"] = features["sequence_length"]
            features["input_token_length"] = features["sequence_length"]  # should be an int
            try:
                output_ids = model.generate(example_input, attention_mask=inputs["attention_mask"])
                output_token_length = output_ids.shape[1] if len(output_ids.shape) > 1 else 0
            except Exception:
                output_token_length = 0
            features["output_token_length"] = int(output_token_length)
        except Exception as e:
            # On error, still emit required fields for frontend
            features.setdefault("model", model_name if 'model_name' in locals() else None)
            features.setdefault("model_architecture", None)
            features.setdefault("batch_size", 1)
            features.setdefault("sequence_length", 0)
            features.setdefault("input_text", input_text if 'input_text' in locals() else None)
            features.setdefault("input_size", 0)
            features.setdefault("tokens", 0)
            features.setdefault("input_token_length", 0)
            features.setdefault("output_token_length", 0)
            features["error"] = str(e)
        # Add default values for metrics not available in feature extraction
        features.setdefault("inference_time", None)
        features.setdefault("output_generation_time", None)
        features.setdefault("output_token_count", None)
        features.setdefault("avg_cpu_power", None)
        features.setdefault("avg_gpu_power", None)
        features.setdefault("peak_power", None)
        print(json.dumps(features))
