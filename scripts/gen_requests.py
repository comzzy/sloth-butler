"""Generate diverse dreaded-request messages with the Groq teacher."""
import json, random, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, "scripts"); from common import groq_chat, jl_write
random.seed(7)
CATS = ["meeting invite", "favour from a friend", "boss's quick ask", "group-chat ask", "family request", "client scope creep",
        "colleague asking you to cover their shift/task", "neighbour or landlord request", "church/community volunteering ask", "event/party invite",
        "money/loan request", "networking 'pick your brain' ask"]
SETTINGS = ["Lagos tech startup", "Abuja civil service office", "Port Harcourt oil-services firm", "Nigerian family WhatsApp group", "university in Ibadan",
            "London agency", "US remote SaaS team", "freelance designer", "small shop owner in Enugu", "Toronto hospital", "Nairobi NGO", "student club", "church in Lagos", "open-source project"]
def batch(i):
    cat = CATS[i % len(CATS)]; sets = random.sample(SETTINGS, 3)
    p = (f"Write 10 realistic, distinct messages that someone might RECEIVE and dread, category: {cat}. Contexts to mix: {', '.join(sets)}. "
         "Vary sender (boss, aunt, client, friend, coworker, pastor, landlord...), channel (email, WhatsApp, Slack, SMS), length (1 line to a short paragraph), tone (pushy, sweet, guilt-trippy, casual). "
         "Some may be written in Nigerian Pidgin or Nigerian English. Include concrete details (names, dates, amounts). Do not write replies. "
         'Return JSON: {"messages":[{"sender":"...","channel":"...","text":"..."}]}')
    try:
        out = json.loads(groq_chat([{"role": "user", "content": p}], temperature=1.0, json_mode=True))["messages"]
        return [dict(category=cat, **m) for m in out if m.get("text")]
    except Exception as e:
        print("fail", i, e); return []
with ThreadPoolExecutor(6) as ex: res = [r for b in ex.map(batch, range(40)) for r in b]
seen, rows = set(), []
for r in res:
    k = r["text"].strip().lower()[:80]
    if k in seen: continue
    seen.add(k); rows.append(r)
random.shuffle(rows)
for i, r in enumerate(rows):
    r["id"] = i
    r["language"] = "Nigerian Pidgin" if random.random() < 0.25 else "English"
    r["style"] = random.choice(["soft", "firm", "maybe-later"])
jl_write("data/requests.jsonl", rows); print(len(rows))
