"""Evaluate base Qwen3-8B vs the LoRA fine-tune on the held-out test set.
Same system prompt, user message format (web/lib/prompt.ts), renderer, temperature and seed for both.
Judge: openai/gpt-oss-120b, rubric in scripts/judge.py, plus a blind pairwise preference."""
import json, random, re, sys, statistics as st
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, "scripts")
from common import jl_read, jl_write, groq_chat, parse_json, row_msgs, user_msg
from judge import judge, CRITERIA
from tinker_chat import TinkerChat

SEED = 2026; TEMP = 0.7
PRICE = {"prefill": 0.195, "sample": 0.60}  # USD per 1M tokens, Qwen3-8B on Tinker list price
BASE = "Qwen/Qwen3-8B"; RENDERER = "qwen3_disable_thinking"
CKPT = json.load(open("eval/training.json"))["sampler_path"]
test = jl_read("data/test.jsonl")
models = {"base": TinkerChat(BASE, renderer_name=RENDERER), "finetuned": TinkerChat(BASE, model_path=CKPT, renderer_name=RENDERER)}
TICS = [r"\bunfortunately\b", r"\bI hope this (?:message|email) finds you\b", r"\bplease don'?t hesitate\b", r"\bI completely understand\b", r"\bat this time\b", r"\bkind regards\b", r"\bbest regards\b", r"\u2014"]

def run(name, r):
    out, m = models[name].chat(row_msgs(r), max_tokens=400, temperature=TEMP, seed=SEED)
    out = re.sub(r"<think>.*?</think>", "", out, flags=re.S).strip()
    m["cost_usd"] = (m["prompt_tokens"] * PRICE["prefill"] + m["completion_tokens"] * PRICE["sample"]) / 1e6
    return dict(id=r["id"], reply=out, meta=m, words=len(re.findall(r"\b[\w'’]+\b", out)), tics=sum(len(re.findall(t, out, re.I)) for t in TICS))

outs = {}
for name in models:
    with ThreadPoolExecutor(8) as ex: outs[name] = list(ex.map(lambda r: run(name, r), test))
for name in models:
    with ThreadPoolExecutor(8) as ex: js = list(ex.map(lambda i: judge(test[i], outs[name][i]["reply"]), range(len(test))))
    for o, j in zip(outs[name], js): o["judge"] = j

rng = random.Random(SEED)
def judge_pair(i, flip):
    r = test[i]; a, b = outs["base"][i]["reply"], outs["finetuned"][i]["reply"]
    first, second = (b, a) if flip else (a, b)
    p = (f"A freelancer/small business owner got this message and needs a reply that is polite but firm with one concrete counter-offer.\n\nTask:\n{user_msg(r['text'], r['style'], r['language'], r.get('scenario'), r.get('context'))}\n\n"
         f"Reply 1:\n{first}\n\nReply 2:\n{second}\n\nWhich reply would the business owner actually send? Consider whether it is sendable as-is, holds the line politely, has a sensible counter-offer, fits the message, and is in the right language and tone. "
         'Answer JSON {"choice": 1|2, "reason": "..."}.')
    try: c = int(parse_json(groq_chat([{"role": "user", "content": p}], temperature=0, max_tokens=1200, json_mode=True))["choice"])
    except Exception as e: return dict(id=r["id"], winner=None, reason=str(e))
    ft_pos = 1 if flip else 2
    return dict(id=r["id"], winner="finetuned" if c == ft_pos else "base", finetuned_position=ft_pos)
flips = [rng.random() < 0.5 for _ in test]
with ThreadPoolExecutor(8) as ex: pairs = list(ex.map(judge_pair, range(len(test)), flips))

def summary(n):
    o = outs[n]; N = len(o); J = [x["judge"] for x in o if x["judge"]]
    pid = [x["judge"] for x, r in zip(o, test) if x["judge"] and r["language"] == "Nigerian Pidgin"]
    return dict(n=N, judged=len(J), pass_rate=sum(all(j[c] >= 4 for c in CRITERIA) for j in J) / len(J),
                per_rule={c: sum(j[c] >= 4 for j in J) / len(J) for c in CRITERIA},
                avg_score={c: st.mean(j[c] for j in J) for c in CRITERIA},
                avg_words=st.mean(x["words"] for x in o), ai_tics_per_100=100 * sum(x["tics"] for x in o) / N,
                pidgin_correct_rate=(sum(j["correct_language"] >= 4 for j in pid) / len(pid)) if pid else None, pidgin_n=len(pid),
                latency_s_mean=st.mean(x["meta"]["latency_s"] for x in o), latency_s_median=st.median(x["meta"]["latency_s"] for x in o),
                cost_usd_per_reply=st.mean(x["meta"]["cost_usd"] for x in o), avg_completion_tokens=st.mean(x["meta"]["completion_tokens"] for x in o))
valid = [p for p in pairs if p["winner"]]
res = dict(seed=SEED, temperature=TEMP, checkpoint=CKPT, base_model=BASE, judge="openai/gpt-oss-120b", n_test=len(test),
           criteria=CRITERIA, pass_threshold="score >= 4 of 5 from the judge",
           base=summary("base"), finetuned=summary("finetuned"),
           pairwise=dict(n=len(valid), finetuned_wins=sum(p["winner"] == "finetuned" for p in valid), base_wins=sum(p["winner"] == "base" for p in valid)))
json.dump(res, open("eval/results.json", "w"), indent=2)
jl_write("eval/outputs.jsonl", [dict(id=r["id"], scenario=r["scenario"], style=r["style"], language=r["language"], context=r.get("context"), request=r["text"],
        base=outs["base"][i], finetuned=outs["finetuned"][i], pairwise=pairs[i]) for i, r in enumerate(test)])
print(json.dumps(res, indent=1))
