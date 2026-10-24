import { generateReply, modelConfig, ModelError } from "@/lib/model";
import { LANGUAGES, type Language, type Scenario, type Style } from "@/lib/prompt";
import { checkTerms, correctionLine, fmt, parseTerms, termsLine } from "@/lib/terms";
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
  const owed = amount ? `The amount owed or on the table is ${fmt(amount, terms?.currency)}.` : "";
  try {
    const steps = await Promise.all(STEPS.map(async (s, i) => {
      const r = await generateReply(variant, request, s.style, language, scenario, {
        terms: terms && termsLine(terms),
        extra: `${s.brief(terms?.lateFee ?? "")} It will be sent ${days[i]} days after their last message. ${owed} Do not decline anything; this is a follow-up, not a refusal.`.trim(),
      });
      let text = r.text;
      if (terms && checkTerms(text, terms).length) text = `${text}\n\n${correctionLine(terms)}`;
      if (s.kind === "final" && terms?.lateFee && !/late fee|fee/i.test(text)) text = `${text}\n\nAfter that date, my late fee applies: ${terms.lateFee}.`;
      return { kind: s.kind, title: s.title, offsetDays: days[i], text };
    }));
    return json({ steps, scenario, model: variant, terms: Boolean(terms) });
  } catch (e) {
    const status = e instanceof ModelError ? e.status : 500;
    return json({ error: e instanceof ModelError ? e.message : "Something went wrong." }, status);
  }
}
