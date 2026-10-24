"""LLM judge rubric shared by data filtering and evaluation. Judge: gpt-oss-120b."""
import json, re
from common import groq_chat, parse_json, user_msg
CRITERIA = ["sendable", "firm_but_polite", "has_counter_offer", "fits_scenario", "correct_language"]
RUBRIC = """Score the reply on each criterion from 1 (bad) to 5 (excellent):
- sendable: could be copied and sent as-is. Short, human, natural, no preamble ("Here's a reply"), no notes, no placeholders like [Name] or [date], no meta commentary, no invented facts (prices, dates, excuses) that contradict or go beyond what the sender message and context give.
- firm_but_polite: polite and respectful, but holds the line clearly (does not cave, does not grovel, no apology at all), and matches the requested tone (soft = warm but clear; firm = short and direct; maybe-later = not now, names a specific later time or condition).
- has_counter_offer: gives exactly one concrete counter-offer (a paid option, a specific later date/slot, a part payment/deposit, or a partial yes). Vague "let me know" does not count; a list of many options scores lower.
- fits_scenario: written from the user's side (the person being asked, owed or kept waiting, never the other party), responds to this specific message and situation, uses the user's figures, currency and dates exactly as given (never below their minimum or above their discount limit; a split payment gives each part its own amount and its own different date), follows any extra instructions in the task (e.g. a follow-up step: only the allowed date, no refusal opener), and the counter-offer makes sense.
- correct_language: written entirely in the requested language, natural and fluent (for Nigerian Pidgin: real natural Naija Pidgin, not English with a few Pidgin words)."""

def judge(row, reply):
    task = user_msg(row["text"], row["style"], row["language"], row.get("scenario"), row.get("context"))
    p = (f"You are grading a reply written for a freelancer/small business owner to send back to a message they dread.\n\nTASK GIVEN TO THE WRITER:\n{task}\n\nREPLY:\n{reply}\n\n{RUBRIC}\n\n"
         'Return JSON: {"sendable":n,"firm_but_polite":n,"has_counter_offer":n,"fits_scenario":n,"correct_language":n,"issue":"one short sentence on the main problem, or empty"}')
    for _ in range(3):
        try:
            j = parse_json(groq_chat([{"role": "user", "content": p}], temperature=0, max_tokens=1500, json_mode=True))
            s = {k: int(j[k]) for k in CRITERIA}
            return dict(s, issue=j.get("issue", ""))
        except Exception as e:
            err = e
    return None
