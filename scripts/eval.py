"""Evaluate base Qwen3-8B vs the LoRA fine-tune on the 60 held-out requests.
Both use the same system prompt, renderer, temperature and seed. Judge: openai/gpt-oss-120b on Groq."""
import json, random, re, sys, statistics as st
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, "scripts")
from common import jl_read, jl_write, groq_chat, SYSTEM_PROMPT, user_msg
from checks import check, RULES
from tinker_chat import TinkerChat

SEED = 2026; TEMP = 0.7
PRICE = {"prefill": 0.195, "sample": 0.60}  # USD per 1M tokens, Qwen3-8B on Tinker, pricing page as of 2026-10-19
BASE = "Qwen/Qwen3-8B"; RENDERER = "qwen3_disable_thinking"
CKPT = json.load(open("eval/training.json"))["sampler_path"]
test = jl_read("data/test.jsonl")
models = {"base": TinkerChat(BASE, renderer_name=RENDERER), "finetuned": TinkerChat(BASE, model_path=CKPT, renderer_name=RENDERER)}

def run(name, r):
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_msg(r["text"], r["style"], r["language"])}]
    out, m = models[name].chat(msgs, max_tokens=400, temperature=TEMP, seed=SEED)
    m["cost_usd"] = (m["prompt_tokens"] * PRICE["prefill"] + m["completion_tokens"] * PRICE["sample"]) / 1e6
    return dict(id=r["id"], reply=out, meta=m, check=check(out, r["style"], r["language"]))

outs = {}
for name in models:
    with ThreadPoolExecutor(8) as ex: outs[name] = list(ex.map(lambda r: run(name, r), test))

def judge_pidgin(reply):
    p = ("You are a native Nigerian Pidgin speaker. Is the following text written in natural, correct Nigerian Pidgin (not standard English with a few Pidgin words, "
         'not broken or made-up Pidgin)? Answer JSON {"pidgin_correct": true|false, "reason": "..."}.\n\nText:\n' + reply)
    try: return json.loads(groq_chat([{"role": "user", "content": p}], temperature=0, max_tokens=800, json_mode=True))
    except Exception as e: return {"pidgin_correct": None, "reason": f"judge error: {e}"}

rng = random.Random(SEED)
def judge_pair(i):
    r = test[i]; a, b = outs["base"][i]["reply"], outs["finetuned"][i]["reply"]
    flip = rng.random() < 0.5
    first, second = (b, a) if flip else (a, b)
    p = (f"Someone received this message and wants to say 'not now' kindly but firmly (style: {r['style']}, language: {r['language']}).\n\nMessage:\n{r['text']}\n\n"
         f"Reply 1:\n{first}\n\nReply 2:\n{second}\n\nWhich reply would you actually send? Consider honesty, clarity, warmth, brevity, and whether it sounds like a real person. "
         'Answer JSON {"choice": 1|2, "reason": "..."}.')
    try:
        j = json.loads(groq_chat([{"role": "user", "content": p}], temperature=0, max_tokens=800, json_mode=True)); c = int(j["choice"])
    except Exception as e:
        return dict(id=r["id"], winner=None, reason=f"judge error: {e}")
    ft_pos = 1 if flip else 2
    return dict(id=r["id"], winner="finetuned" if c == ft_pos else "base", finetuned_position=ft_pos, reason=j.get("reason", ""))
flips = [None] * len(test)
pairs = [judge_pair(i) for i in range(len(test))]  # sequential so the position RNG is reproducible
pid_idx = [i for i, r in enumerate(test) if r["language"] == "Nigerian Pidgin"]
pidgin = {n: [judge_pidgin(outs[n][i]["reply"]) for i in pid_idx] for n in models}

def summary(n):
    o = outs[n]; N = len(o)
    pj = [x["pidgin_correct"] for x in pidgin[n] if x["pidgin_correct"] is not None]
    return dict(n=N, pass_rate=sum(x["check"]["pass"] for x in o) / N,
                per_rule={k: sum(x["check"]["rules"][k] for x in o) / N for k in RULES},
                avg_words=st.mean(x["check"]["words"] for x in o),
                ai_tics_per_100=100 * sum(x["check"]["tics"] for x in o) / N,
                pidgin_correct_rate=(sum(pj) / len(pj)) if pj else None, pidgin_n=len(pj),
                latency_s_mean=st.mean(x["meta"]["latency_s"] for x in o), latency_s_median=st.median(x["meta"]["latency_s"] for x in o),
                cost_usd_per_reply=st.mean(x["meta"]["cost_usd"] for x in o),
                avg_completion_tokens=st.mean(x["meta"]["completion_tokens"] for x in o))
valid = [p for p in pairs if p["winner"]]
res = dict(seed=SEED, temperature=TEMP, checkpoint=CKPT, base_model=BASE, judge="openai/gpt-oss-120b (Groq)", n_test=len(test),
           base=summary("base"), finetuned=summary("finetuned"),
           pairwise=dict(n=len(valid), finetuned_wins=sum(p["winner"] == "finetuned" for p in valid), base_wins=sum(p["winner"] == "base" for p in valid)),
           )
json.dump(res, open("eval/results.json", "w"), indent=2)
jl_write("eval/outputs.jsonl", [dict(id=r["id"], category=r["category"], style=r["style"], language=r["language"], request=r["text"],
        base=outs["base"][i], finetuned=outs["finetuned"][i], pairwise=pairs[i],
        pidgin_judge={n: pidgin[n][pid_idx.index(i)] for n in models} if i in pid_idx else None) for i, r in enumerate(test)])
print(json.dumps({k: v for k, v in res.items()}, indent=1))
