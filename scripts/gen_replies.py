"""Split requests into train/test, generate teacher replies for train, keep only replies that pass checks.py."""
import random, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, "scripts")
from tinker_chat import TinkerChat
from common import jl_read, jl_write, SYSTEM_PROMPT, user_msg
from checks import check
SEED = 1234
rows = jl_read("data/requests.jsonl")
rng = random.Random(SEED); rng.shuffle(rows)
test, train = rows[:60], rows[60:]
jl_write("data/test.jsonl", test)
TEACHER_HINT = (" Use the word 'can't' or a clear 'no' in sentence one. Exactly one sentence should contain the offer, phrased with 'I can' (Pidgin: 'I fit'). "
                "Do not use 'unfortunately', 'I understand' or sign-offs.")
TEACHER = TinkerChat('openai/gpt-oss-120b')  # same open-weight teacher as on Groq, sampled on Tinker to avoid Groq rate limits
def gen(r, k=3):
    for a in range(k):
        out, _ = TEACHER.chat([{"role": "system", "content": SYSTEM_PROMPT + TEACHER_HINT},
                         {"role": "user", "content": user_msg(r["text"], r["style"], r["language"])}], temperature=0.7 + 0.1 * a, max_tokens=1200, seed=SEED + a)
        c = check(out, r["style"], r["language"])
        if c["pass"]: return dict(r, reply=out, attempts=a + 1)
    return dict(r, reply=None, last=out, fail=[k for k, v in c["rules"].items() if not v])
with ThreadPoolExecutor(16) as ex: res = list(ex.map(gen, train))
ok = [r for r in res if r["reply"]]
jl_write("data/train.jsonl", ok); jl_write("data/rejected.jsonl", [r for r in res if not r["reply"]])
print(f"test={len(test)} train_candidates={len(train)} kept={len(ok)}")
