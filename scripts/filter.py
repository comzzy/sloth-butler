"""Final hard filters on teacher replies: no apologies in any language, follow-ups use only the pinned date and never open with a refusal."""
import re, sys, collections
sys.path.insert(0, "scripts"); from common import jl_read, jl_write
APOL = r"\b(sorry|apolog|lo siento|disculp|perd[oó]n|désolé|desolee|excuse[sz]|pardon|entschuldig|tut mir leid|desculp|lamento|no vex)"
REFUSE = r"^\s*(no\b|i can'?t|i cannot|i won'?t|no puedo|je ne peux|não posso|ich kann nicht|i no fit)"
MONTHS = r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\b"
rows = jl_read("data/train.jsonl"); keep, why = [], collections.Counter()
for r in rows:
    t = r["reply"]
    if re.search(APOL, t, re.I): why["apology"] += 1; continue
    if r.get("mode") == "followup":
        if re.search(REFUSE, t, re.I): why["refusal_opener"] += 1; continue
        if r["language"] == "English":
            day, mon = r["deadline_pinned"].split()
            if r["deadline_pinned"] not in t or len(set(m.lower() for m in re.findall(MONTHS, t, re.I))) > 1: why["dates"] += 1; continue
    keep.append(r)
jl_write("data/train.jsonl", keep); print(len(rows), "->", len(keep), dict(why))
print(collections.Counter(r["scenario"] for r in keep), collections.Counter(r["language"] for r in keep), collections.Counter(r["style"] for r in keep), collections.Counter(r["mode"] for r in keep), sum("terms" in r["context"] for r in keep))
