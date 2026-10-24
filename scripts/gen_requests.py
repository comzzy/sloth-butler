"""Generate realistic incoming messages freelancers, small businesses and online sellers dread, with optional context."""
import json, os, random, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, "scripts"); from common import groq_chat, parse_json, jl_write, SCENARIOS, LANGUAGES, STYLES
random.seed(11)
SCEN_DESC = {
  "scope-creep": "a client asking for free extra work beyond the agreed scope (extra revisions, 'one more page', 'quick tweak', new features, extra deliverables)",
  "discount": "a customer or client asking for a discount, a lower price, 'mate's rates', a bulk deal or haggling",
  "late-invoice": "a client who has not paid an invoice on time, is making excuses, asking for more time, or has gone quiet after a reminder",
  "credit": "a customer wanting to take goods or start a service now and pay later, pay in instalments with nothing upfront, or buy on credit",
  "waiting": "a client or prospect who said they would get back to you about a quote, proposal, decision or payment and then went quiet, or replies with a vague 'still thinking, will let you know'",
  "favour": "a last-minute favour, rush job, urgent call or meeting request (tonight, this weekend, in an hour), often from a client or contact",
  "other": "another dreaded ask: free samples, unpaid 'trial' work, 'exposure' instead of pay, returns outside policy, working for equity, a friend wanting free help with their business",
}
INDUSTRIES = ["graphic designer", "web developer", "copywriter", "photographer", "wedding videographer", "bakery owner", "Etsy jewellery seller", "Shopify clothing store",
  "social media manager", "translator", "tutor", "personal trainer", "hair stylist", "event planner", "accountant/bookkeeper", "architect", "interior designer",
  "mobile app developer", "video editor", "voice-over artist", "carpenter", "plumber", "caterer", "printing shop", "phone accessories seller on Instagram",
  "fashion designer/tailor", "SEO consultant", "music producer", "illustrator", "virtual assistant", "cleaning business", "car detailer", "florist",
  "online course creator", "UX researcher", "furniture maker", "handmade soap seller", "IT support contractor", "marketing agency (2 people)", "data analyst freelancer"]
PLACES = ["USA", "UK", "Canada", "Australia", "Germany", "France", "Spain", "Mexico", "Brazil", "Portugal", "Argentina", "Colombia", "India", "Philippines",
  "South Africa", "Kenya", "Nigeria", "Ghana", "UAE", "Singapore", "Netherlands", "Ireland", "New Zealand", "Japan", "Poland", "Morocco", "Senegal", "Switzerland", "Austria", "Belgium", "Quebec"]
LANG_PLACES = {"Spanish": ["Spain", "Mexico", "Argentina", "Colombia", "Chile", "Peru"], "French": ["France", "Belgium", "Quebec", "Senegal", "Morocco", "Switzerland"],
  "Portuguese": ["Brazil", "Portugal", "Angola", "Mozambique"], "German": ["Germany", "Austria", "Switzerland"], "Nigerian Pidgin": ["Lagos", "Abuja", "Port Harcourt", "Benin City", "Enugu", "Warri"]}
LANG_W = [("English", 0.5), ("Spanish", 0.1), ("French", 0.1), ("Portuguese", 0.1), ("German", 0.08), ("Nigerian Pidgin", 0.12)]
SCEN_W = [("scope-creep", 0.2), ("discount", 0.18), ("late-invoice", 0.18), ("credit", 0.14), ("favour", 0.18), ("other", 0.12)]
ONLY = os.environ.get("ONLY"); N_BATCH = int(os.environ.get("N_BATCH", 150)); OUT = os.environ.get("OUT", "data/requests.jsonl")
if ONLY: SCEN_W = [(ONLY, 1.0)]; random.seed(99)
pick = lambda w: random.choices([a for a, _ in w], [b for _, b in w])[0]

def batch(i):
    scen, lang = pick(SCEN_W), pick(LANG_W)
    inds = random.sample(INDUSTRIES, 4)
    places = random.sample(LANG_PLACES.get(lang, PLACES), min(3, len(LANG_PLACES.get(lang, PLACES))))
    msg_lang = "Nigerian Pidgin or casual Nigerian English" if lang == "Nigerian Pidgin" else lang
    p = (f"Write 8 realistic, distinct messages that a freelancer, small business owner or online seller might RECEIVE and dread. Situation: {SCEN_DESC[scen]}. "
         f"Businesses to mix: {', '.join(inds)}. Locations: {', '.join(places)}. Write every message in {msg_lang}. "
         "Vary the sender (client, customer, agency, friend, relative, repeat buyer), channel (email, WhatsApp, Instagram DM, SMS, Upwork/Fiverr chat, Slack), length (one line to a short paragraph), "
         "and tone (pushy, sweet, guilt-trippy, casual, entitled, apologetic). Include concrete details (names, items, amounts in the local currency, dates). "
         "For each, also give the receiver's private context they might type into a helper app: rate or price (with currency symbol or code, e.g. '$85/hour', '€450 per logo', 'R2,500', '₹30,000 per site', '₦45,000'), "
         "deadline or timing, and a short note. Leave some context fields empty (\"\") so that about a third of messages have no context at all. Context fields are written in English. Do not write replies. "
         'Return JSON: {"messages":[{"business":"...","sender":"...","channel":"...","text":"...","context":{"rate":"","deadline":"","notes":""}}]}')
    try:
        out = parse_json(groq_chat([{"role": "user", "content": p}], temperature=1.0, json_mode=True))["messages"]
        return [dict(scenario=scen, language=lang, **m) for m in out if isinstance(m, dict) and m.get("text") and len(m["text"]) > 15]
    except Exception as e:
        print("fail", i, e, flush=True); return []

with ThreadPoolExecutor(6) as ex: res = [r for b in ex.map(batch, range(N_BATCH)) for r in b]
seen, rows = set(), []
for r in res:
    k = r["text"].strip().lower()[:70]
    if k in seen: continue
    seen.add(k)
    c = r.get("context") if isinstance(r.get("context"), dict) else {}
    r["context"] = {k2: str(c.get(k2) or "").strip()[:(300 if k2 == "notes" else 80)] for k2 in ["rate", "deadline", "notes"]}
    r["context"] = {k2: v for k2, v in r["context"].items() if v}
    rows.append(r)
random.shuffle(rows)
for i, r in enumerate(rows):
    r["id"] = i; r["style"] = random.choice(STYLES)
    if random.random() < 0.08: r["scenario_given"] = False  # the app allows no scenario; keep some examples without it
jl_write(OUT, rows); print(len(rows))
