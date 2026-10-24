import { generateReply, modelConfig, ModelError } from "@/lib/model";
import { LANGUAGES, SCENARIO_IDS, STYLES, type Context, type Language, type Scenario, type Style } from "@/lib/prompt";
import { clientIp, json, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET() {
  const c = modelConfig();
  return json({ configured: c.hasKey, finetune: Boolean(c.finetunePath), baseModel: c.baseModel });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Send a JSON body." }, 400); }
  const request = typeof body.request === "string" ? body.request.trim() : "";
  const style = body.style as Style;
  const language = body.language as Language;
  const compare = body.compare === true;
  const scenario = typeof body.scenario === "string" && body.scenario ? body.scenario as Scenario : undefined;
  const raw = (body.context && typeof body.context === "object" ? body.context : {}) as Record<string, unknown>;
  const field = (k: string, max: number) => typeof raw[k] === "string" ? (raw[k] as string).trim().slice(0, max) || undefined : undefined;
  const ctx: Context = { rate: field("rate", 80), deadline: field("deadline", 80), notes: field("notes", 300) };
  if (request.length < 5) return json({ error: "Paste a request (at least 5 characters)." }, 400);
  if (request.length > 2000) return json({ error: "That request is too long. Keep it under 2,000 characters." }, 400);
  if (!STYLES.includes(style)) return json({ error: "Pick a style: soft, firm or maybe-later." }, 400);
  if (!LANGUAGES.includes(language)) return json({ error: `Pick a language: ${LANGUAGES.join(", ")}.` }, 400);
  if (scenario && !SCENARIO_IDS.includes(scenario)) return json({ error: `Pick a situation: ${SCENARIO_IDS.join(", ")}.` }, 400);

  const rl = rateLimit(`decline:${clientIp(req)}`, compare ? 6 : 15);
  if (!rl.ok) return json({ error: `Too many requests. Try again in ${rl.retryAfter}s.` }, 429, { "Retry-After": String(rl.retryAfter) });

  try {
    if (compare) {
      const [base, finetune] = await Promise.allSettled([
        generateReply("base", request, style, language, scenario, ctx),
        generateReply("finetune", request, style, language, scenario, ctx),
      ]);
      const pack = (r: PromiseSettledResult<Awaited<ReturnType<typeof generateReply>>>) =>
        r.status === "fulfilled" ? r.value : { error: (r.reason as Error).message };
      return json({ base: pack(base), finetune: pack(finetune) });
    }
    const cfg = modelConfig();
    const variant = cfg.finetunePath ? "finetune" : "base";
    const out = await generateReply(variant, request, style, language, scenario, ctx);
    return json({ ...out, fallback: variant === "base" ? "The trained model isn't set up, so this came from the untrained one." : undefined });
  } catch (e) {
    const status = e instanceof ModelError ? e.status : 500;
    return json({ error: e instanceof ModelError ? e.message : "Something went wrong." }, status);
  }
}
