"""
Extract features from a PyTorch model using thop.
"""
import torch
try:
    from thop import profile
except ImportError:
    profile = None

def extract_model_features(model, example_input):
    if profile is None:
        raise ImportError("Please install thop: pip install thop")
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
    import json
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    # Load Qwen 0.6B model and tokenizer
    model_name = "Qwen/Qwen3-0.6B"
    model = AutoModelForCausalLM.from_pretrained(model_name)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    # Prepare example input (batch of 1, 16 tokens)
    input_text = "Hello, this is a test."
    inputs = tokenizer(input_text, return_tensors="pt")
    example_input = inputs["input_ids"]
    # Extract features
    features = extract_model_features(model, example_input)
    print(json.dumps(features, indent=2))
