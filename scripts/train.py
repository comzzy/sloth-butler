"""LoRA SFT of Qwen3-8B on Tinker. Flat loop adapted from tinker-cookbook recipes/sl_loop.py."""
import json, random, sys, time
import tinker
from tinker_cookbook import renderers
from tinker_cookbook.supervised.data import conversation_to_datum
from tinker_cookbook.supervised.common import compute_mean_nll
from tinker_cookbook.tokenizer_utils import get_tokenizer
sys.path.insert(0, "scripts")
from common import jl_read, row_msgs

BASE = "Qwen/Qwen3-8B"; RENDERER = "qwen3_disable_thinking"
SEED, EPOCHS, BATCH, LR, RANK = 0, 3, 16, 2e-4, 32
tok = get_tokenizer(BASE); renderer = renderers.get_renderer(RENDERER, tok)
rows = jl_read("data/train.jsonl")
convs = [row_msgs(r) + [{"role": "assistant", "content": r["reply"]}] for r in rows]
tc = tinker.ServiceClient().create_lora_training_client(base_model=BASE, rank=RANK)
rng = random.Random(SEED); steps_per_epoch = len(convs) // BATCH; total = steps_per_epoch * EPOCHS
log, t_start, n_tokens, step = [], time.time(), 0, 0
for ep in range(EPOCHS):
    rng.shuffle(convs)
    for b in range(steps_per_epoch):
        batch = [conversation_to_datum(c, renderer, 2048, renderers.TrainOnWhat.LAST_ASSISTANT_MESSAGE) for c in convs[b*BATCH:(b+1)*BATCH]]
        n_tokens += sum(d.model_input.length for d in batch)
        lr = LR * (1 - step / total)
        fb = tc.forward_backward(batch, loss_fn="cross_entropy"); op = tc.optim_step(tinker.AdamParams(learning_rate=lr, beta1=0.9, beta2=0.95, eps=1e-8))
        res = fb.result(); op.result()
        nll = compute_mean_nll([x["logprobs"] for x in res.loss_fn_outputs], [d.loss_fn_inputs["weights"] for d in batch])
        log.append(dict(step=step, epoch=ep, lr=lr, nll=nll)); print(f"step {step}/{total} nll {nll:.3f}", flush=True); step += 1
path = tc.save_weights_for_sampler(name="sloth-butler-replies").result().path
state = tc.save_state(name="sloth-butler-replies-state").result().path
info = dict(base_model=BASE, renderer=RENDERER, seed=SEED, epochs=EPOCHS, batch_size=BATCH, lr=LR, lora_rank=RANK, train_examples=len(rows),
            steps=total, train_tokens_processed=n_tokens, wall_time_s=time.time() - t_start, sampler_path=path, state_path=state, log=log)
json.dump(info, open("eval/training.json", "w"), indent=2); print(path)
