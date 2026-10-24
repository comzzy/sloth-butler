// Dates and openers for follow-up steps, kept out of the model's hands.
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const M = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";
const ORD = "(?:st|nd|rd|th)?";
const WD = "(?:(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,?\\s+)?";
const DATE_RE = new RegExp(`\\b${WD}(?:${M}\\s+\\d{1,2}${ORD}(?:,?\\s+\\d{4})?|(?:the\\s+)?\\d{1,2}${ORD}\\s+(?:of\\s+)?${M}(?:,?\\s+\\d{4})?|\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?)\\b`, "gi");
const RELATIVE_RE = /\b(?:by|before|until)\s+(?:the\s+)?(?:end of (?:this|the|next) (?:week|month)|(?:this|next) (?:week|month|monday|tuesday|wednesday|thursday|friday)|tomorrow|today|tonight|end of day|eod|the weekend)\b/gi;

export function parseDay(s: unknown): Date {
  const m = typeof s === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date();
  if (!m) d.setUTCHours(0, 0, 0, 0);
  const now = Date.now();
  return Math.abs(d.getTime() - now) > 3 * 864e5 ? new Date(new Date(now).setUTCHours(0, 0, 0, 0)) : d;
}
export function addDays(d: Date, n: number) { return new Date(d.getTime() + n * 864e5); }
export function longDate(d: Date) { return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; }

/** Replace every date the model wrote with the one we set, and pin vague deadlines to it. */
export function pinDates(text: string, deadline: string, ask = "Please settle this by") {
  let fixed = 0;
  let out = text.replace(DATE_RE, m => { if (m.trim().toLowerCase() === deadline.toLowerCase()) return m; fixed++; return deadline; });
  out = out.replace(RELATIVE_RE, m => { fixed++; return `${m.split(/\s+/)[0]} ${deadline}`; });
  if (!out.includes(deadline)) { out = `${out.trimEnd()}\n\n${ask} ${deadline}.`; fixed++; }
  return { text: out, fixed };
}

const REFUSAL_RE = /^\s*(?:no\b|nope\b|unfortunately\b|sorry\b|i'?m afraid\b|i (?:can(?:'|no)t|cannot|won'?t|am unable|'m unable|am not able)\b|that'?s not\b|i'?m not able\b)/i;
export const OPENERS = {
  nudge: "Hi, just a friendly nudge on this.",
  reminder: "Following up again on this, as I haven't heard back.",
  final: "This is my final note on this.",
} as const;

/** Drop a refusal-style first sentence and start with an opener that fits the stage. */
export function fixOpener(text: string, kind: keyof typeof OPENERS) {
  let t = text.trim(), changed = false;
  for (let i = 0; i < 2 && REFUSAL_RE.test(t); i++) {
    const m = /^[^.!?\n]*[.!?]+\s*/.exec(t);
    t = m && m[0].length < t.length ? t.slice(m[0].length) : t.replace(REFUSAL_RE, "").replace(/^[\s,.:;-]+/, "");
    changed = true;
  }
  if (changed || !/^(hi|hello|hey|dear|good (morning|afternoon)|following|just|this is|a quick|quick)/i.test(t)) {
    t = `${OPENERS[kind]} ${t.charAt(0).toUpperCase()}${t.slice(1)}`; changed = true;
  }
  return { text: t, changed };
}
export const startsWithRefusal = (t: string) => REFUSAL_RE.test(t);
