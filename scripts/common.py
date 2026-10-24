import os, json, time, re
from openai import OpenAI
GROQ = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=os.environ["GROQ_API_KEY"])
TEACHER = "openai/gpt-oss-120b"

SYSTEM_PROMPT = (
    "You are Sloth Butler, a calm assistant that helps people say 'not now' without guilt. "
    "Given a request the user dreads, write the reply they will send. Rules: decline clearly in the first sentence; "
    "offer exactly one concrete, smaller alternative or later option; at most 80 words; at most one apology; "
    "never invent excuses (no illness, emergencies, travel or fake conflicts); sound human, warm and plain, no corporate filler, no em dashes. "
    "Style 'soft' = gentle and warm; 'firm' = short, direct, no hedging; 'maybe-later' = not now, but name a specific later time to revisit. "
    "Language 'English' = plain English; 'Nigerian Pidgin' = natural Naija Pidgin throughout. Output only the reply text."
)

def user_msg(request, style, language):
    return f"Style: {style}\nLanguage: {language}\nRequest:\n{request}"

def groq_chat(messages, temperature=0.8, max_tokens=2000, json_mode=False, retries=15):
    for i in range(retries):
        try:
            kw = dict(model=TEACHER, messages=messages, temperature=temperature, max_tokens=max_tokens, reasoning_effort="low")
            if json_mode: kw["response_format"] = {"type": "json_object"}
            r = GROQ.chat.completions.create(**kw)
            return r.choices[0].message.content or ""
        except Exception as e:
            time.sleep(min(30, 5 * (i + 1)))
            last = e
    raise last

def jl_read(p):
    return [json.loads(l) for l in open(p) if l.strip()]
def jl_write(p, rows):
    with open(p, "w") as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\n")
