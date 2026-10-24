export const STYLES = ["soft", "firm", "maybe-later"] as const;
export const LANGUAGES = ["English", "Spanish", "French", "Portuguese", "German", "Nigerian Pidgin"] as const;
export type Style = (typeof STYLES)[number];
export type Language = (typeof LANGUAGES)[number];

export const SCENARIOS = {
  "scope-creep": { label: "Free extra work", brief: "A client is asking for extra work or scope beyond what was agreed, without paying for it. Keep the original scope; the counter-offer should be a paid add-on, a quote, or moving it to a later phase." },
  discount: { label: "Discount request", brief: "Someone is asking for a discount. Keep the price; the counter-offer should be a smaller package at a lower price, a small add-on instead of a cut, or a discount only for upfront payment." },
  "late-invoice": { label: "Late or unpaid invoice", brief: "A client owes money on an invoice that is late or unpaid and is making excuses or asking for more time. Ask clearly for payment; the counter-offer should be a specific payment date or a part payment now." },
  credit: { label: "Pay later / credit", brief: "Someone wants to buy now and pay later, or asks for credit. Do not extend open credit; the counter-offer should be a deposit now and the rest on a fixed date, or holding the item until paid." },
  waiting: { label: "They said they'd get back to you", brief: "Someone said they would get back to the user (on a quote, a decision or a payment) and has gone quiet. Follow up politely; the counter-offer should be a clear deadline to decide or a short call at a set time." },
  favour: { label: "Last-minute favour or meeting", brief: "Someone wants a last-minute favour, call or meeting. Protect the time; the counter-offer should be a specific later slot or a shorter, smaller version." },
  other: { label: "Something else", brief: "A request the user does not want to accept as asked. Say no to the request as asked and offer one fair alternative." },
} as const;
export type Scenario = keyof typeof SCENARIOS;
export const SCENARIO_IDS = Object.keys(SCENARIOS) as Scenario[];

// Must match the prompt used in training (scripts/common.py).
export const SYSTEM_PROMPT =
  "You are Sloth Butler. " +
  "You write the reply a freelancer, small business owner or online seller will send to a message they dread: free extra work, a discount request, a late or unpaid invoice, a pay-later request, a client who went quiet, a last-minute favour or meeting. " +
  "Write as the user, from their side: they are the one being asked, owed or kept waiting. " +
  "Rules: polite and firm; hold the line clearly early on; give exactly one concrete counter-offer (a paid option, a specific later date, or a partial yes); use the user's figures and dates exactly as given and never invent prices, dates or excuses; never go below their minimum or above their discount limit; if you split a payment, give each part its own amount and its own date; never apologise; at most 90 words; no greeting fluff, no sign-off, no corporate filler, no em dashes; sound like a real person. " +
  "Style 'soft' = warm and friendly but clear; 'firm' = short and direct, no hedging; 'maybe-later' = not now, but name a specific later time or condition. " +
  "Write the whole reply in the requested language; 'Nigerian Pidgin' = natural Naija Pidgin throughout. " +
  "Output only the reply text.";

export type Context = { rate?: string; deadline?: string; notes?: string; terms?: string; extra?: string };

/** The first three lines keep the training format; scenario and context are appended before the request. */
export function userMessage(request: string, style: Style, language: Language, scenario?: Scenario, ctx: Context = {}) {
  const lines = [`Style: ${style}`, `Language: ${language}`];
  if (scenario) lines.push(`Situation: ${SCENARIOS[scenario].brief} Stay polite and firm, and use the facts below if they help.`);
  const facts = [ctx.rate && `my rate or price is ${ctx.rate}`, ctx.deadline && `timing: ${ctx.deadline}`, ctx.notes && ctx.notes].filter(Boolean);
  if (facts.length) lines.push(`My context: ${facts.join("; ")}`);
  if (ctx.terms) lines.push(ctx.terms);
  if (ctx.extra) lines.push(ctx.extra);
  if (language !== "English" && language !== "Nigerian Pidgin") lines.push(`Write the whole reply in ${language}.`);
  return `${lines.join("\n")}\nRequest:\n${request}`;
}
