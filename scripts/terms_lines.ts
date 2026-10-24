// Renders "My terms" lines and amounts with the web app's own formatter so training text matches production exactly.
import { fmt, termsLine, parseTerms } from "../web/lib/terms";
let s = ""; process.stdin.on("data", d => (s += d)).on("end", () => {
  const rows = JSON.parse(s) as { terms: unknown; amount?: number; currency?: string }[];
  const out = rows.map(r => { const t = r.terms ? parseTerms(r.terms) : undefined;
    return { line: t ? termsLine(t) : null, amount: r.amount ? fmt(r.amount, t?.currency ?? r.currency) : null }; });
  process.stdout.write(JSON.stringify(out));
});
