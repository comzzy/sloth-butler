"""Split requests into train/test, write teacher replies for train, keep only replies the judge scores >= 4 on every criterion and that pass basic checks."""
import random, re, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, "scripts")
from common import jl_read, jl_write, groq_chat, row_msgs, SYSTEM_PROMPT
from judge import judge, CRITERIA
SEED = 1234; N_TEST = 100
rows = jl_read("data/requests_all.jsonl")
rng = random.Random(SEED); rng.shuffle(rows)
test, train = rows[:N_TEST], rows[N_TEST:]
jl_write("data/test.jsonl", test)
HINT = ("\n\nExtra guidance for this reply: vary how you open (do not always start with 'Thanks' or 'I can't'); keep it under 70 words when possible; "
        "if a price is needed but none was given, offer to send a quote rather than inventing a number; if a date is needed and none was given, you may name a plausible day (e.g. 'Friday'); "
        "never apologise; if you split a payment, give two different dates; use the user's figures exactly; "
        "address the sender by first name only when the message gives it; no sign-off or signature; no em dashes.")
def basic_ok(t, lang):
    if not t or len(t.split()) > 95 or len(t.split()) < 8: return False
    if "\u2014" in t or re.search(r"\[[^\]]+\]|^(here'?s|sure|reply:)", t, re.I | re.M): return False
    return True
def gen(r, k=3):
    last = None
    for a in range(k):
        m = row_msgs(r); m[0] = dict(m[0], content=SYSTEM_PROMPT + HINT)
        out = groq_chat(m, temperature=0.8 + 0.1 * a, max_tokens=2000).strip().strip('"')
        if not basic_ok(out, r["language"]): last = dict(reply=out, why="basic"); continue
        j = judge(r, out)
        if j and all(j[c] >= 4 for c in CRITERIA): return dict(r, reply=out, judge=j, attempts=a + 1)
        last = dict(reply=out, judge=j)
    return dict(r, reply=None, last=last)
import json, os, threading
CACHE = "data/.gen_cache.jsonl"; cache = {}
if os.path.exists(CACHE):
    for l in open(CACHE): x = json.loads(l); cache[x["id"]] = x
lk = threading.Lock(); done = [0]
def gen_p(r):
    if r["id"] in cache: return cache[r["id"]]
    x = gen(r); done[0] += 1
    with lk: open(CACHE, "a").write(json.dumps(x, ensure_ascii=False) + "\n")
    if done[0] % 50 == 0: print("done", done[0], flush=True)
    return x
with ThreadPoolExecutor(32) as ex: res = list(ex.map(gen_p, train))
ok = [r for r in res if r["reply"]]
jl_write("data/train.jsonl", ok); jl_write("data/rejected.jsonl", [r for r in res if not r["reply"]])
print(f"test={len(test)} train_candidates={len(train)} kept={len(ok)}")
