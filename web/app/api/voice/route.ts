import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { clientIp, json, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
const VOICE = () => process.env.ELEVENLABS_VOICE_ID || "Xb7hH8MSUJpSbSDYk0k2"; // Alice: calm British female, premade (works on the free plan)
const MODEL = "eleven_multilingual_v2";
const CACHE_DIR = process.env.VERCEL ? path.join("/tmp", "voice-cache") : path.join(process.cwd(), ".cache", "voice");
const mem = new Map<string, Buffer>();

function audio(buf: Buffer, hit: boolean) {
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400", "X-Cache": hit ? "HIT" : "MISS" } });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Send a JSON body." }, 400); }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return json({ error: "Nothing to read yet." }, 400);
  if (text.length > 800) return json({ error: "That reply is too long to read aloud." }, 400);
  if (!process.env.ELEVENLABS_API_KEY) return json({ error: "Voice is not configured: set ELEVENLABS_API_KEY on the server." }, 503);

  const key = createHash("sha256").update(`${VOICE()}|${MODEL}|${text}`).digest("hex");
  const file = path.join(CACHE_DIR, `${key}.mp3`);
  const cached = mem.get(key) ?? (await readFile(file).catch(() => null));
  if (cached) { mem.set(key, cached); return audio(cached, true); }

  const rl = rateLimit(`voice:${clientIp(req)}`, 8);
  if (!rl.ok) return json({ error: `Too many voice requests. Try again in ${rl.retryAfter}s.` }, 429, { "Retry-After": String(rl.retryAfter) });

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE()}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": process.env.ELEVENLABS_API_KEY },
      body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.65, similarity_boost: 0.75, style: 0.05, speed: 0.92 } }),
    });
    if (!res.ok) {
      console.error(`[voice] HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
      return json({ error: "The voice service could not read this reply." }, 502);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    mem.set(key, buf);
    await mkdir(CACHE_DIR, { recursive: true }).then(() => writeFile(file, buf)).catch(() => {});
    return audio(buf, false);
  } catch (e) {
    console.error("[voice] failed:", (e as Error).message);
    return json({ error: "Could not reach the voice service." }, 502);
  }
}
