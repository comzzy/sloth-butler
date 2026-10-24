import { SYSTEM_PROMPT, userMessage, type Language, type Style } from "./prompt";

const DEFAULT_BASE_URL = "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1";

export type Variant = "finetune" | "base";
export class ModelError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

export function modelConfig() {
  return {
    baseUrl: process.env.TINKER_OAI_BASE_URL || DEFAULT_BASE_URL,
    hasKey: Boolean(process.env.TINKER_API_KEY),
    baseModel: process.env.BASE_MODEL || "Qwen/Qwen3-8B",
    finetunePath: process.env.MODEL_FINETUNE_PATH || "",
  };
}

function clean(text: string) {
  // Defensive cleanup: drop stray template fragments and repeated paragraphs.
  const seen = new Set<string>();
  const parts = text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/^(?:[ \t]*\S{0,2}[ \t]*\n)+/, "")
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 2 && !seen.has(p) && (seen.add(p), true));
  return parts.join("\n\n")
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<\/?think>/g, "")
    .replace(/\s*\u2014\s*/g, ", ")
    .trim();
}

/** Sample one reply from Tinker's OpenAI-compatible chat endpoint. */
export async function generateReply(variant: Variant, request: string, style: Style, language: Language) {
  const cfg = modelConfig();
  if (!cfg.hasKey) throw new ModelError("Model is not configured: set TINKER_API_KEY on the server.", 503);
  const model = variant === "finetune" ? cfg.finetunePath : cfg.baseModel;
  if (!model) throw new ModelError("Fine-tuned checkpoint is not configured: set MODEL_FINETUNE_PATH on the server.", 503);

  // Render exactly like the training renderer (tinker_cookbook "qwen3_disable_thinking") and use
  // /completions, so the server cannot re-template the prompt. Same prompt for base and fine-tune.
  const prompt =
    `<|im_start|>system\n${SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n${userMessage(request, style, language)}<|im_end|>\n` +
    `<|im_start|>assistant\n<think>\n\n</think>\n\n`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  const t0 = Date.now();
  try {
    const res = await fetch(`${cfg.baseUrl}/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TINKER_API_KEY}` },
      body: JSON.stringify({ model, prompt, max_tokens: 300, temperature: 0.7, stop: ["<|im_end|>", "<|im_start|>"] }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[model] ${variant} HTTP ${res.status}: ${body.slice(0, 300)}`);
      throw new ModelError(res.status === 429 ? "The model is busy. Try again in a moment." : "The model service returned an error.", res.status === 429 ? 429 : 502);
    }
    const data = await res.json();
    const text = clean(String(data?.choices?.[0]?.text ?? ""));
    if (!text) throw new ModelError("The model returned an empty reply. Try again.");
    return { text, model, variant, latencyMs: Date.now() - t0 };
  } catch (e) {
    if (e instanceof ModelError) throw e;
    if ((e as Error).name === "AbortError") throw new ModelError("The model took too long to answer. Try again.", 504);
    console.error("[model] request failed:", (e as Error).message);
    throw new ModelError("Could not reach the model service.");
  } finally {
    clearTimeout(timer);
  }
}
