import os, json, time, re, threading
from openai import OpenAI
GROQ = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=os.environ["GROQ_API_KEY"])
TEACHER = "openai/gpt-oss-120b"

# Must match web/lib/prompt.ts (SYSTEM_PROMPT, SCENARIOS briefs and userMessage()).
SYSTEM_PROMPT = (
    "You are Sloth Butler. You write the reply a freelancer, small business owner or online seller will send to a message they dread: "
    "free extra work, a discount request, a late or unpaid invoice, a pay-later request, a client who went quiet, a last-minute favour or meeting. "
    "Write as the user, from their side: they are the one being asked, owed or kept waiting. "
    "Rules: polite and firm; hold the line clearly early on; give exactly one concrete counter-offer (a paid option, a specific later date, or a partial yes); "
    "use the user's figures and dates exactly as given and never invent prices, dates or excuses; never go below their minimum or above their discount limit; "
    "if you split a payment, give each part its own amount and its own date; never apologise; at most 90 words; no greeting fluff, no sign-off, no corporate filler, no em dashes; sound like a real person. "
    "Style 'soft' = warm and friendly but clear; 'firm' = short and direct, no hedging; 'maybe-later' = not now, but name a specific later time or condition. "
    "Write the whole reply in the requested language; 'Nigerian Pidgin' = natural Naija Pidgin throughout. Output only the reply text."
)
LANGUAGES = ["English", "Spanish", "French", "Portuguese", "German", "Nigerian Pidgin"]
STYLES = ["soft", "firm", "maybe-later"]
SCENARIOS = {
  "scope-creep": "A client is asking for extra work or scope beyond what was agreed, without paying for it. Keep the original scope; the counter-offer should be a paid add-on, a quote, or moving it to a later phase.",
  "discount": "Someone is asking for a discount. Keep the price; the counter-offer should be a smaller package at a lower price, a small add-on instead of a cut, or a discount only for upfront payment.",
  "late-invoice": "A client owes money on an invoice that is late or unpaid and is making excuses or asking for more time. Ask clearly for payment; the counter-offer should be a specific payment date or a part payment now.",
  "credit": "Someone wants to buy now and pay later, or asks for credit. Do not extend open credit; the counter-offer should be a deposit now and the rest on a fixed date, or holding the item until paid.",
  "waiting": "Someone said they would get back to the user (on a quote, a decision or a payment) and has gone quiet. Follow up politely; the counter-offer should be a clear deadline to decide or a short call at a set time.",
  "favour": "Someone wants a last-minute favour, call or meeting. Protect the time; the counter-offer should be a specific later slot or a shorter, smaller version.",
  "other": "A request the user does not want to accept as asked. Say no to the request as asked and offer one fair alternative.",
}

def user_msg(request, style, language, scenario=None, ctx=None):
    ctx = ctx or {}
    lines = [f"Style: {style}", f"Language: {language}"]
    if scenario: lines.append(f"Situation: {SCENARIOS[scenario]} Stay polite and firm, and use the facts below if they help.")
    facts = [x for x in [ctx.get("rate") and f"my rate or price is {ctx['rate']}", ctx.get("deadline") and f"timing: {ctx['deadline']}", ctx.get("notes")] if x]
    if facts: lines.append("My context: " + "; ".join(facts))
    if ctx.get("terms"): lines.append(ctx["terms"])
    if ctx.get("extra"): lines.append(ctx["extra"])
    if language not in ("English", "Nigerian Pidgin"): lines.append(f"Write the whole reply in {language}.")
    return "\n".join(lines) + "\nRequest:\n" + request

def row_msgs(r):
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_msg(r["text"], r["style"], r["language"], r.get("scenario") if r.get("scenario_given", True) else None, r.get("context"))}]

_groq_off = 0.0
_tk = None; _tkl = threading.Lock()
def _tinker_teacher():
    global _tk
    with _tkl:
        if _tk is None:
            from tinker_chat import TinkerChat
            _tk = TinkerChat(TEACHER)
    return _tk

def groq_chat(messages, temperature=0.8, max_tokens=3000, json_mode=False, retries=3):
    """Groq first; fall back to the same open-weight teacher sampled on Tinker when Groq rate-limits."""
    global _groq_off
    for i in range(retries if time.time() > _groq_off else 0):
        try:
            kw = dict(model=TEACHER, messages=messages, temperature=temperature, max_tokens=max_tokens, reasoning_effort="low")
            if json_mode: kw["response_format"] = {"type": "json_object"}
            return GROQ.chat.completions.create(**kw).choices[0].message.content or ""
        except Exception as e:
            if "429" in str(e) or "rate" in str(e).lower(): _groq_off = time.time() + 60; break
            time.sleep(2)
    out, _ = _tinker_teacher().chat(messages, max_tokens=max_tokens + 2000, temperature=max(temperature, 0.01))
    return out

def parse_json(s):
    m = re.search(r"\{.*\}", s, re.S)
    return json.loads(m.group(0) if m else s)

def jl_read(p):
    return [json.loads(l) for l in open(p) if l.strip()]
def jl_write(p, rows):
    with open(p, "w") as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\n")
