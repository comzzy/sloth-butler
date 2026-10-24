"""Merge request files, assign ids/styles, and attach 'Your terms' and 3-step follow-up prompts exactly as the web app builds them
(web/lib/terms.ts termsLine, web/app/api/followups/route.ts). Terms lines are rendered by the app's own code via scripts/terms_lines.ts."""
import json, random, subprocess, sys, datetime as dt
sys.path.insert(0, "scripts"); from common import jl_read, jl_write, STYLES
random.seed(21)
rows = jl_read("data/requests.jsonl") + jl_read("data/requests_waiting.jsonl")
CUR_BY_LANG = {"Spanish": ["EUR", "MXN", "ARS", "COP", "USD"], "French": ["EUR", "CAD", "CHF", "XOF", "MAD"], "Portuguese": ["BRL", "EUR"], "German": ["EUR", "CHF"],
               "Nigerian Pidgin": ["NGN"], "English": ["USD", "GBP", "EUR", "CAD", "AUD", "INR", "ZAR", "KES", "GHS", "NGN", "PHP", "SGD", "AED", "NZD"]}
SCALE = {"USD": 1, "GBP": 0.8, "EUR": 0.9, "CAD": 1.4, "AUD": 1.5, "NZD": 1.6, "SGD": 1.3, "AED": 3.7, "CHF": 0.9, "INR": 85, "ZAR": 18, "KES": 130, "GHS": 15, "NGN": 1500,
         "PHP": 57, "MXN": 18, "ARS": 1000, "COP": 4000, "BRL": 5.5, "XOF": 600, "MAD": 10}
def nice(x):
    for step in [1, 5, 10, 50, 100, 500, 1000, 5000, 10000]:
        if x / step < 30: return int(round(x / step) * step) or step
    return int(round(x, -4))
PAY = ["50% upfront, rest on delivery", "50% deposit, balance within 7 days", "invoices due in 14 days", "net 30", "full payment before work starts", "30% deposit, 70% on handover",
       "due on receipt", "two equal parts: deposit then on delivery", "payment within 7 days of invoice"]
LATE = ["2% per month after the due date", "a flat {c} fee", "5% after 14 days late", "1.5% per month", "work pauses until paid"]
AVAIL = ["next Tuesday", "from the 3rd of next month", "Monday mornings", "after the 15th", "Thursday 2pm", "next week"]
def make_terms(cur):
    k = SCALE[cur]; t = {"currency": cur}
    if random.random() < 0.3: t["name"] = random.choice(["Ana", "Tom", "Chidi", "Priya", "Lukas", "Sofia", "Kemi", "Jean", "Mariana", "Sam", "Aisha", "Diego"])
    if random.random() < 0.7: t["rate"] = nice(random.choice([25, 40, 60, 85, 120, 150]) * k); t["rateUnit"] = random.choice(["hour", "hour", "day"])
    if t.get("rateUnit") == "day": t["rate"] = nice(t["rate"] * 7)
    if random.random() < 0.7: t["minProject"] = nice(random.choice([200, 300, 500, 800, 1200, 2000]) * k)
    if random.random() < 0.6: t["maxDiscount"] = random.choice([0, 5, 10, 10, 15, 20])
    if random.random() < 0.6: t["payment"] = random.choice(PAY)
    if random.random() < 0.5: t["lateFee"] = random.choice(LATE).replace("{c}", f"{nice(25 * k)} {cur}")
    if random.random() < 0.3: t["available"] = random.choice(AVAIL)
    return t
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
long_date = lambda d: f"{d.day} {MONTHS[d.month - 1]}"
STEPS = [("nudge", "Friendly nudge", "soft", lambda late: "This is follow-up 1 of 3 because they have not replied or paid yet. Write a short, friendly nudge that assumes good faith and restates what is owed or pending."),
         ("reminder", "Firmer reminder", "firm", lambda late: "This is follow-up 2 of 3. They still have not replied or paid after a friendly nudge. Be firmer and name one specific date for payment or a decision."),
         ("final", "Final notice", "firm", lambda late: f"This is follow-up 3 of 3, the final notice. Say plainly what happens next{f', including the late fee ({late})' if late else ''}, and give one last date. Stay polite, no threats beyond that.")]
def followup_extra(scen, i, terms, amount_str):
    days = random.choice([[3, 7, 14], [2, 5, 10], [5, 10, 21], [1, 4, 7]])
    today = dt.date(2026, random.randint(1, 12), random.randint(1, 28))
    send = [today + dt.timedelta(d) for d in days]
    dl = [long_date(today + dt.timedelta(max(days[j + 1], days[j] + 1)) if j < 2 else send[j] + dt.timedelta(7)) for j in range(3)]
    who = ("Context: I sent them a quote or proposal and they said they would get back to me, then went quiet. I am the one waiting; I am asking them for their decision. Never apologise."
           if scen == "waiting" else "Context: I sent an invoice and it is unpaid. I am asking them to pay. Never apologise.")
    owed = f"The amount owed or on the table is {amount_str}." if amount_str else ""
    kind, title, style, brief = STEPS[i]
    late = (terms or {}).get("lateFee", "") if scen == "late-invoice" else ""
    extra = (f"{who} {brief(late)} Today is {long_date(send[i])}. The only date you may mention is {dl[i]}: ask for {'an answer' if scen == 'waiting' else 'payment'} by {dl[i]}. "
             f"Do not mention any other date. {owed} Do not decline anything and do not start with \"No\"; this is a follow-up, not a refusal. Open the way a {title.lower()} would.").strip()
    return style, extra, kind, dl[i]
import re
CUR_PAT = {"BRL": r"R\$|\bBRL\b|\breais\b", "ZAR": r"\bR ?\d|\bZAR\b|\brand\b", "EUR": r"€|\bEUR\b|\beuros?\b", "GBP": r"£|\bGBP\b", "INR": r"₹|\bINR\b|\bRs\.?", "NGN": r"₦|\bNGN\b|\bnaira\b",
  "PHP": r"₱|\bPHP\b", "KES": r"\bKES\b|\bKSh", "GHS": r"₵|\bGHS\b|\bcedis?\b", "CAD": r"CA\$|\bCAD\b", "AUD": r"A\$|\bAUD\b", "MXN": r"\bMXN\b|MX\$", "CHF": r"\bCHF\b",
  "AED": r"\bAED\b|\bdirhams?\b", "SGD": r"S\$|\bSGD\b", "NZD": r"NZ\$|\bNZD\b", "MAD": r"\bMAD\b", "XOF": r"\bXOF\b|\bFCFA\b|\bCFA\b", "COP": r"\bCOP\b", "ARS": r"\bARS\b", "USD": r"\$|\bUSD\b"}
out = []
for r in rows:
    r["style"] = r.get("style") or random.choice(STYLES)
    r["context"] = r.get("context") or {}
    cur = random.choice(CUR_BY_LANG[r["language"]])
    seen = [c for c, pat in CUR_PAT.items() if re.search(pat, r["text"] + " " + json.dumps(r["context"], ensure_ascii=False))]
    if seen: cur = seen[0]
    u = random.random()
    if r["scenario"] in ("late-invoice", "waiting") and u < 0.4:
        r["mode"] = "followup"; r["scenario_given"] = True
        r["terms_obj"] = make_terms(cur) if random.random() < 0.6 else None
        amt = nice(random.choice([150, 400, 900, 1500, 3000]) * SCALE[cur]) if random.random() < 0.8 else None
        r["amount"] = amt; r["currency"] = cur; r["step"] = random.randrange(3)
        r["context"] = {}  # the follow-up route sends only terms + extra
    elif u < 0.5:
        r["mode"] = "reply"; r["terms_obj"] = make_terms(cur); r["context"].pop("rate", None)
    else:
        r["mode"] = "reply"; r["terms_obj"] = None
    out.append(r)
# Render terms lines and amounts with the app's own code.
payload = [dict(terms=r["terms_obj"], amount=r.get("amount"), currency=r.get("currency")) for r in out]
res = json.loads(subprocess.run(["npx", "-y", "tsx", "scripts/terms_lines.ts"], input=json.dumps(payload), capture_output=True, text=True, check=True).stdout)
for r, x in zip(out, res):
    if x["line"]: r["context"]["terms"] = x["line"]
    if r["mode"] == "followup":
        style, extra, kind, dl = followup_extra(r["scenario"], r["step"], r["terms_obj"], x["amount"])
        r["style"] = style; r["context"]["extra"] = extra; r["followup_step"] = kind; r["deadline_pinned"] = dl
    r.pop("step", None)
random.shuffle(out)
for i, r in enumerate(out): r["id"] = i
jl_write("data/requests_all.jsonl", out)
import collections
print(len(out), collections.Counter(r["mode"] for r in out), sum("terms" in r["context"] for r in out), collections.Counter(r["scenario"] for r in out))
