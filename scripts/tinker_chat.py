"""Chat sampling on Tinker (base models or LoRA checkpoints) via tinker-cookbook renderers."""
import threading, time, tinker
_LOCK = threading.Lock()  # HF fast tokenizers are not thread-safe
from tinker_cookbook import renderers, model_info
from tinker_cookbook.tokenizer_utils import get_tokenizer
_sc = None
class TinkerChat:
    def __init__(self, base_model, model_path=None, renderer_name=None):
        global _sc
        _sc = _sc or tinker.ServiceClient()
        self.tok = get_tokenizer(base_model)
        self.renderer = renderers.get_renderer(renderer_name or model_info.get_recommended_renderer_name(base_model), self.tok)
        self.client = _sc.create_sampling_client(model_path=model_path) if model_path else _sc.create_sampling_client(base_model=base_model)
    def chat(self, messages, max_tokens=400, temperature=0.7, seed=None):
        with _LOCK:
            prompt = self.renderer.build_generation_prompt(messages)
        params = tinker.SamplingParams(max_tokens=max_tokens, temperature=temperature, stop=self.renderer.get_stop_sequences(), seed=seed)
        t0 = time.time()
        res = self.client.sample(prompt=prompt, sampling_params=params, num_samples=1).result()
        dt = time.time() - t0
        toks = res.sequences[0].tokens
        with _LOCK:
            msg, _ = self.renderer.parse_response(toks)
        content = msg["content"]
        if isinstance(content, list):
            content = "".join(p.get("text", "") for p in content if p.get("type") == "text")
        return content.strip(), dict(latency_s=dt, prompt_tokens=prompt.length, completion_tokens=len(toks))
