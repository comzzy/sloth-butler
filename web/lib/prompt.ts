export const STYLES = ["soft", "firm", "maybe-later"] as const;
export const LANGUAGES = ["English", "Spanish", "French", "Portuguese", "German", "Nigerian Pidgin"] as const;
export type Style = (typeof STYLES)[number];
export type Language = (typeof LANGUAGES)[number];

export const SCENARIOS = {
  "scope-creep": { label: "Free extra work", brief: "A client is asking for extra work or scope beyond what was agreed, without paying for it. Keep the original scope; the counter-offer should be a paid add-on, a quote, or moving it to a later phase." },
  discount: { label: "Discount request", brief: "Someone is asking for a discount. Keep the price; the counter-offer should be a smaller package at a lower price, a small add-on instead of a cut, or a discount only for upfront payment." },
  "late-invoice": { label: "Late or unpaid invoice", brief: "A client owes money on an invoice that is late or unpaid and is making excuses or asking for more time. Ask clearly for payment; the counter-offer should be a specific payment date or a part payment now." },
  credit: { label: "Pay later / credit", brief: "Someone wants to buy now and pay later, or asks for credit. Do not extend open credit; the counter-offer should be a deposit now and the rest on a fixed date, or holding the item until paid." },
  favour: { label: "Last-minute favour or meeting", brief: "Someone wants a last-minute favour, call or meeting. Protect the time; the counter-offer should be a specific later slot or a shorter, smaller version." },
  other: { label: "Something else", brief: "A request the user does not want to accept as asked. Say no to the request as asked and offer one fair alternative." },
} as const;
export type Scenario = keyof typeof SCENARIOS;
export const SCENARIO_IDS = Object.keys(SCENARIOS) as Scenario[];

// Must match the prompt used in training (scripts/common.py).
export const SYSTEM_PROMPT =
  "You are Sloth Butler, a calm assistant that helps people say 'not now' without guilt. " +
  "Given a request the user dreads, write the reply they will send. Rules: decline clearly in the first sentence; " +
  "offer exactly one concrete, smaller alternative or later option; at most 80 words; at most one apology; " +
  "never invent excuses (no illness, emergencies, travel or fake conflicts); sound human, warm and plain, no corporate filler, no em dashes. " +
  "Style 'soft' = gentle and warm; 'firm' = short, direct, no hedging; 'maybe-later' = not now, but name a specific later time to revisit. " +
  "Language 'English' = plain English; 'Nigerian Pidgin' = natural Naija Pidgin throughout. Output only the reply text.";

export type Context = { rate?: string; deadline?: string; notes?: string };

/** The first three lines keep the training format; scenario and context are appended before the request. */
export function userMessage(request: string, style: Style, language: Language, scenario?: Scenario, ctx: Context = {}) {
  const lines = [`Style: ${style}`, `Language: ${language}`];
  if (scenario) lines.push(`Situation: ${SCENARIOS[scenario].brief} Stay polite and firm, and use the facts below if they help.`);
  const facts = [ctx.rate && `my rate or price is ${ctx.rate}`, ctx.deadline && `timing: ${ctx.deadline}`, ctx.notes && ctx.notes].filter(Boolean);
  if (facts.length) lines.push(`My context: ${facts.join("; ")}`);
  if (language !== "English" && language !== "Nigerian Pidgin") lines.push(`Write the whole reply in ${language}.`);
  return `${lines.join("\n")}\nRequest:\n${request}`;
}
