import { readFile } from "node:fs/promises";
import path from "node:path";
import { json } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const candidates = [process.env.EVAL_RESULTS_PATH, path.join(process.cwd(), "..", "eval", "results.json"), path.join(process.cwd(), "public", "eval", "results.json")].filter(Boolean) as string[];
  for (const p of candidates) {
    try { return json({ ok: true, results: JSON.parse(await readFile(p, "utf8")) }); } catch {}
  }
  return json({ ok: false, error: "Eval results are not published yet." }, 404);
}
