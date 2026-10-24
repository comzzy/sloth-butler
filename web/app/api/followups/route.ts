import { generateReply, modelConfig, ModelError } from "@/lib/model";
import { LANGUAGES, type Language, type Scenario, type Style } from "@/lib/prompt";
import { checkTerms, enforceTerms, fmt, parseTerms, termsLine } from "@/lib/terms";
import { addDays, fixOpener, longDate, parseDay, pinDates, startsWithRefusal } from "@/lib/followup-text";
import { clientIp, json, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const STEPS: { kind: "nudge" | "reminder" | "final"; title: string; style: Style; brief: (late: string) => string }[] = [
  { kind: "nudge", title: "Friendly nudge", style: "soft", brief: () => "This is follow-up 1 of 3 because they have not replied or paid yet. Write a short, friendly nudge that assumes good faith and restates what is owed or pending." },
  { kind: "reminder", title: "Firmer reminder", style: "firm", brief: () => "This is follow-up 2 of 3. They still have not replied or paid after a friendly nudge. Be firmer and name one specific date for payment or a decision." },
  { kind: "final", title: "Final notice", style: "firm", brief: late => `This is follow-up 3 of 3, the final notice. Say plainly what happens next${late ? `, including the late fee (${late})` : ""}, and give one last date. Stay polite, no threats beyond that.` },
];

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Send a JSON body." }, 400); }
  const request = typeof body.request === "string" ? body.request.trim() : "";
  const scenario = (body.scenario === "waiting" ? "waiting" : "late-invoice") as Scenario;
  const language = (LANGUAGES.includes(body.language as Language) ? body.language : "English") as Language;
  const amount = typeof body.amount === "number" && body.amount > 0 ? Math.min(body.amount, 1e9) : undefined;
  const days = Array.isArray(body.days) && body.days.length === 3 ? body.days.map(d => Math.max(0, Math.min(365, Math.round(Number(d) || 0)))) : [3, 7, 14];
  if (request.length < 5) return json({ error: "Paste their message (at least 5 characters)." }, 400);
  if (request.length > 2000) return json({ error: "That message is too long. Keep it under 2,000 characters." }, 400);
  const terms = parseTerms(body.terms);

  const rl = rateLimit(`followups:${clientIp(req)}`, 5);
  if (!rl.ok) return json({ error: `Too many requests. Try again in ${rl.retryAfter}s.` }, 429, { "Retry-After": String(rl.retryAfter) });

  const variant = modelConfig().finetunePath ? "finetune" : "base";
  const today = parseDay(body.today);
  const sendAt = days.map(d => addDays(today, d));
  const deadlines = sendAt.map((d, i) => longDate(i < 2 ? addDays(today, Math.max(days[i + 1], days[i] + 1)) : addDays(d, 7)));
  const ask = scenario === "waiting" ? "Could you let me know by" : "Please settle this by";
  const who = scenario === "waiting" ? "Context: I sent them a quote or proposal and they said they would get back to me, then went quiet. I am the one waiting; I am asking them for their decision. Never apologise." : "Context: I sent an invoice and it is unpaid. I am asking them to pay. Never apologise.";
  const owed = amount ? `The amount owed or on the table is ${fmt(amount, terms?.currency)}.` : "";
  try {
    const steps = await Promise.all(STEPS.map(async (s, i) => {
      const r = await generateReply(variant, request, s.style, language, scenario, {
        terms: terms && termsLine(terms),
        extra: `${who} ${s.brief(scenario === "late-invoice" ? terms?.lateFee ?? "" : "")} Today is ${longDate(sendAt[i])}. The only date you may mention is ${deadlines[i]}: ask for ${scenario === "waiting" ? "an answer" : "payment"} by ${deadlines[i]}. Do not mention any other date. ${owed} Do not decline anything and do not start with "No"; this is a follow-up, not a refusal. Open the way a ${s.title.toLowerCase()} would.`.trim(),
      });
      const opener = fixOpener(r.text, s.kind);
      const pinned = pinDates(opener.text, deadlines[i], ask);
      let text = pinned.text;
      if (terms && checkTerms(text, terms).length) text = enforceTerms(text, terms);
      if (s.kind === "final" && scenario === "late-invoice" && terms?.lateFee && !/late fee|fee/i.test(text)) text = `${text}\n\nAfter that date, my late fee applies: ${terms.lateFee}.`;
      if (startsWithRefusal(text)) text = fixOpener(text, s.kind).text;
      return { kind: s.kind, title: s.title, offsetDays: days[i], sendOn: sendAt[i].toISOString().slice(0, 10), deadline: deadlines[i], text, fixes: { opener: opener.changed, dates: pinned.fixed } };
    }));
    return json({ steps, scenario, model: variant, terms: Boolean(terms) });
  } catch (e) {
    const status = e instanceof ModelError ? e.status : 500;
    return json({ error: e instanceof ModelError ? e.message : "Something went wrong." }, status);
  }
}
