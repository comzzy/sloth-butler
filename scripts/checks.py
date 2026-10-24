"""Deterministic reply checker. Each rule returns True (pass) or False (fail)."""
import re

DECLINE = [r"\bcan(?:'|’)?t\b", r"\bcannot\b", r"\bwon(?:'|’)?t\b", r"\bnot able\b", r"\bunable\b", r"\bhave to pass\b", r"\bgoing to pass\b",
           r"\bi(?:'|’)ll pass\b", r"\bpass on\b", r"\bsay no\b", r"\bnot (?:right )?now\b", r"\bnot this time\b", r"\bnot going to\b", r"\bno\b",
           r"\bdecline\b", r"\bnot available\b", r"\bnot take (?:this|it) on\b", r"\bsit this (?:one )?out\b", r"\bdon(?:'|’)?t have (?:the )?(?:capacity|bandwidth|room)\b",
           r"\bno fit\b", r"\bno go\b", r"\bno dey\b", r"\bno get\b", r"\bnot for now\b", r"\bmust pass\b", r"\bgo pass\b", r"\bnot be able\b", r"\bnot possible\b", r"\bstep back\b", r"\bnot taking\b"]
OFFER = [r"\bi can(?!['’]?t\b|not\b)\b", r"\bi could(?!n)\b", r"\bhow about\b", r"\bwhat about\b", r"\binstead\b", r"\bwould .{0,40}\bwork\b", r"\bhappy to .{0,30}(?:send|share|review|look|chat|call|join)",
         r"\bi(?:'|’)ll\b(?! (?:have to |need to )?pass)(?! not)", r"\bi(?:'|’)d be glad\b", r"\bi fit\b", r"\bi go\b(?! pass)", r"\bmake we\b", r"\bwe fit\b", r"\blet(?:'|’)s\b", r"\bi(?:'|’)m free\b", r"\bi dey free\b",
         r"\bif you(?:'|’)d like\b", r"\bfeel free to\b", r"\bcheck back\b", r"\brevisit\b", r"\bcircle back\b", r"\breach out\b", r"\bping me\b", r"\bcall me\b", r"\bholla me\b", r"\bjust send\b", r"\bsend me\b", r"\bsend am\b"]
TICS = ["\u2014", "\u2013", "i hope this (?:message )?finds you well", r"\bdelve", r"\bi understand\b", r"\brest assured\b", r"\bhappy to help\b", r"\bi appreciate your understanding\b",
        r"\bthank you for reaching out\b", r"\bthanks for reaching out\b", r"\bplease don(?:'|’)?t hesitate\b", r"\bat this time\b", r"\bplease be advised\b",
        r"\bi completely understand\b", r"\bkindly note\b", r"\bnavigate\b", r"\bleverage\b", r"\bseamless", r"\bin today(?:'|’)s\b", r"\bjourney\b",
        r"\bas an ai\b", r"\bi hope you understand\b", r"\bwarm regards\b", r"\bbest regards\b", r"\bi truly value\b", r"\bunfortunately\b", r"\bat the end of the day\b", r"\bgame[- ]changer\b"]
EXCUSES = [r"\bsick\b", r"\bill\b", r"\billness\b", r"\bhospital", r"\bemergenc", r"\bfuneral\b", r"\bflu\b", r"\bmalaria\b", r"\bfever\b", r"\bdoctor\b",
           r"\btravell?ing\b", r"\bout of town\b", r"\bbereave", r"\bpassed away\b", r"\bsurgery\b", r"\bmy (?:mum|mom|dad|wife|husband|child|kid)\b.{0,30}\b(?:sick|unwell)", r"\bunwell\b",
           r"\bwedding\b", r"\bprior commitment\b", r"\bdouble[- ]booked\b", r"\bdentist\b"]
PIDGIN = [r"\bdey\b", r"\bno fit\b", r"\babeg\b", r"\bwetin\b", r"\buna\b", r"\bsabi\b", r"\bwahala\b", r"\bna\b", r"\bmake i\b", r"\bmake we\b", r"\bdon\b", r"\bfit\b",
          r"\bam\b", r"\bsha\b", r"\bjare\b", r"\bbiko\b", r"\bnaim\b", r"\bdis\b", r"\bdat\b", r"\bwey\b", r"\bsef\b", r"\boya\b", r"\bkpatakpata\b", r"\bfor now\b(?=.*\bdey\b)", r"\bmy guy\b", r"\bno vex\b"]
HEDGES = [r"\bmaybe\b", r"\bperhaps\b", r"\bi think\b", r"\bif that(?:'|’)s ok\b", r"\bsorry\b", r"\bi feel bad\b"]
LATER = [r"\bnext (?:week|month|quarter|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday|sprint|time)\b", r"\bafter\b", r"\bin (?:january|february|march|april|may|june|july|august|september|october|november|december)\b",
         r"\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b", r"\bend of\b", r"\bin (?:two|three|a few|2|3|4) (?:weeks|days|months)\b",
         r"\bmonday|tuesday|wednesday|thursday|friday|saturday|sunday\b", r"\blater\b", r"\bonce\b", r"\bQ[1-4]\b", r"\btomorrow\b", r"\bweekend\b"]
WARM = [r"\babeg\b", r"\bplease\b", r"\bthank", r"\bappreciate", r"\blove\b", r"\bglad\b", r"\bsweet\b", r"\bkind\b", r"\bsorry\b", r"\bno vex\b", r"\bwell done\b", r"\bgod bless\b", r"\bmean[s]? a lot\b", r"\bdear\b", r"\bmy (?:guy|sister|brother|dear)\b"]

def _n(pats, t): return sum(len(re.findall(p, t, flags=re.I)) for p in pats)
def _any(pats, t): return any(re.search(p, t, flags=re.I) for p in pats)
def sentences(t): return [s for s in re.split(r"(?<=[.!?])\s+|\n+", t.strip()) if s.strip()]

def check(reply, style, language):
    t = reply.strip(); low = t.lower(); sents = sentences(t)
    words = len(re.findall(r"\b[\w'’]+\b", t))
    # an offer sentence is any sentence (after the first, or the first if it also declines+offers) with an offer marker
    offer_sents = sum(1 for s in sents if _any(OFFER, s))
    pid = _n(PIDGIN, low)
    r = {
        "decline_first": bool(sents) and _any(DECLINE, sents[0] if len(sents[0].split()) > 3 or len(sents) == 1 else sents[0] + " " + sents[1]),
        "one_offer": offer_sents == 1,
        "max_80_words": words <= 80,
        "no_double_apology": _n([r"\bsorry\b", r"\bapolog", r"\bno vex\b"], low) <= 1,
        "no_ai_tics": _n(TICS, t) == 0,
        "no_false_excuse": not _any(EXCUSES, low),
        "language_match": (pid >= 3) if language == "Nigerian Pidgin" else (pid <= 1),
        "style_match": {"firm": _n(HEDGES, low) == 0, "maybe-later": _any(LATER, low), "soft": _any(WARM, low)}[style],
    }
    return {"pass": all(r.values()), "rules": r, "words": words, "tics": _n(TICS, t)}

RULES = ["decline_first", "one_offer", "max_80_words", "no_double_apology", "no_ai_tics", "no_false_excuse", "language_match", "style_match"]

if __name__ == "__main__":
    print(check("I can't take this on right now. I can review the deck on Friday if that helps.", "firm", "English"))
    print(check("Abeg I no fit come this Saturday, my hand full. I fit send you small contribution for the party.", "soft", "Nigerian Pidgin"))
