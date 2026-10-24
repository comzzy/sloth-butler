/** "Your terms": saved in the browser, sent with every reply request, enforced on the server. */
export type Terms = {
  name?: string; currency?: string; rate?: number; rateUnit?: "hour" | "day";
  minProject?: number; maxDiscount?: number; payment?: string; lateFee?: string; available?: string;
};

const num = (v: unknown, max = 1e9) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : undefined;
};
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) || undefined : undefined);

export function parseTerms(raw: unknown): Terms | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const cur = (curOf(str(r.currency, 8) || "") || str(r.currency, 3))?.toUpperCase();
  const t: Terms = {
    name: str(r.name, 60), currency: cur && /^[A-Z]{3}$/.test(cur) ? cur : undefined,
    rate: num(r.rate), rateUnit: r.rateUnit === "day" ? "day" : "hour",
    minProject: num(r.minProject), maxDiscount: num(r.maxDiscount, 100),
    payment: str(r.payment, 80), lateFee: str(r.lateFee, 80), available: str(r.available, 80),
  };
  const any = t.name || t.rate !== undefined || t.minProject !== undefined || t.maxDiscount !== undefined || t.payment || t.lateFee || t.available;
  return any ? t : undefined;
}

export function fmt(n: number, c = "USD") {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n); }
  catch { return `${c} ${n}`; }
}

/** One prompt line with the real figures and the hard limits. */
export function termsLine(t: Terms) {
  const c = t.currency || "USD";
  const parts = [
    t.name && `I am ${t.name}`,
    t.rate !== undefined && `my rate is ${fmt(t.rate, c)} per ${t.rateUnit}`,
    t.minProject !== undefined && `my minimum project price is ${fmt(t.minProject, c)}`,
    t.maxDiscount !== undefined && (t.maxDiscount === 0 ? "I do not give discounts" : `the most discount I accept is ${t.maxDiscount}%`),
    t.payment && `payment terms: ${t.payment}`,
    t.lateFee && `late fee: ${t.lateFee}`,
    t.available && `next available: ${t.available}`,
  ].filter(Boolean);
  return `My terms: ${parts.join("; ")}. Use these exact figures in the counter-offer. Never quote a price below my minimum or a discount above my limit.`;
}

const UNIT = /^\s*(?:\/|per\s+|an?\s+|each\s+|la\s+|por\s+)?(?:h\b|hr|hour|day|week|month|item|page|unit|hora|día|dia|heure|jour|stunde|tag)/i;

/** Currency markers, longest first. "$" alone matches any dollar/peso currency. */
const CUR_TOKENS: [string, string][] = [
  ["US$", "USD"], ["MX$", "MXN"], ["CA$", "CAD"], ["AU$", "AUD"], ["NZ$", "NZD"], ["HK$", "HKD"], ["NT$", "TWD"], ["R$", "BRL"], ["A$", "AUD"], ["C$", "CAD"], ["S$", "SGD"],
  ["$", "$"], ["€", "EUR"], ["£", "GBP"], ["₦", "NGN"], ["¥", "JPY"], ["₹", "INR"], ["₱", "PHP"], ["₩", "KRW"], ["₺", "TRY"], ["₽", "RUB"], ["₪", "ILS"], ["₫", "VND"], ["₵", "GHS"], ["zł", "PLN"], ["kr", "SEK"], ["Fr.", "CHF"], ["CHF", "CHF"],
];
const WORDS: Record<string, string> = { euro: "EUR", euros: "EUR", dollar: "$", dollars: "$", dólares: "$", pound: "GBP", pounds: "GBP", naira: "NGN", peso: "MXN", pesos: "MXN", rupee: "INR", rupees: "INR", yen: "JPY", reais: "BRL", real: "BRL", francs: "CHF", kronor: "SEK", krona: "SEK" };
const DOLLARISH = new Set(["USD", "MXN", "CAD", "AUD", "NZD", "HKD", "TWD", "SGD", "ARS", "CLP", "COP"]);
const KR = new Set(["SEK", "NOK", "DKK", "ISK"]);
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SYM = CUR_TOKENS.map(([k]) => esc(k)).join("|");
const NUM = String.raw`\d{1,3}(?:[.,\s\u00a0\u202f']\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
const WORD = Object.keys(WORDS).join("|");
const PRICE_RE = new RegExp(String.raw`(?:(${SYM}|\b[A-Z]{3}\b)\s?(${NUM})\s?(k|mil\b)?|(${NUM})\s?(k|mil\b)?\s?(${SYM}|\b[A-Z]{3}\b|(?:${WORD})\b))`, "g");

/** "8.000" / "8,000" / "8 000" / "8.000,50" / "8,000.50" -> 8000 / 8000.5 */
export function parseAmount(raw: string) {
  let s = raw.replace(/[\s\u00a0\u202f']/g, "");
  const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  if (lastSep >= 0) {
    const tail = s.slice(lastSep + 1);
    const decimal = tail.length <= 2 && !(/^\d{1,3}([.,]\d{3})+$/.test(s));
    s = decimal ? s.slice(0, lastSep).replace(/[.,]/g, "") + "." + tail : s.replace(/[.,]/g, "");
  }
  return Number(s);
}

function curOf(tok: string) {
  const t = tok.trim();
  const hit = CUR_TOKENS.find(([k]) => k === t); if (hit) return hit[1];
  if (WORDS[t.toLowerCase()]) return WORDS[t.toLowerCase()];
  return /^[A-Z]{3}$/.test(t) ? t : undefined;
}
const sameCur = (found: string | undefined, mine: string | undefined) => {
  if (!found || !mine) return true;
  if (found === "$") return DOLLARISH.has(mine);
  if (found === "SEK" && KR.has(mine)) return true;
  if (found === "MXN" && mine === "MXN") return true;
  return found === mine;
};
const NEG = /(can't|cannot|can not|won't|wouldn't|not|no|never|instead of|rather than|below|under|less than|no puedo|não posso)\b[^.!?]{0,30}$/;
const DISC_RE = /(\d+(?:[.,]\d+)?)\s?(?:%|percent|per cent|por ciento|pour cent)\s*(?:off|discount|de descuento|de desconto|de remise|de réduction|rabatt|di sconto|korting)?|(?:discount|reduction|descuento|desconto|remise|rabais|rabatt|sconto)\s+(?:of\s+|del?\s+|von\s+)?(\d+(?:[.,]\d+)?)\s?%/gi;

/** Find prices below the floor (including after a discount) and discounts above the limit. Hourly/day rates and deposits/part payments don't count. */
export function checkTerms(text: string, t: Terms) {
  const issues: string[] = [];
  const discounts: { n: number; at: number }[] = [];
  for (const m of text.matchAll(DISC_RE)) {
    const n = Number((m[1] ?? m[2]).replace(",", ".")); const at = m.index ?? 0;
    const pre = text.slice(Math.max(0, at - 40), at).toLowerCase();
    const isDisc = m[2] !== undefined || /off|discount|descuento|desconto|remise|réduction|rabatt|sconto|korting/i.test(m[0]) || /\b(take|knock|give|offer|discount|descuento|desconto)\b[^.!?]{0,15}$/i.test(pre);
    if (!isDisc || NEG.test(pre)) continue;
    discounts.push({ n, at });
    if (t.maxDiscount !== undefined && n > t.maxDiscount) issues.push(`${n}% discount is above the limit`);
  }
  if (t.minProject !== undefined && t.minProject > 0) {
    for (const m of text.matchAll(PRICE_RE)) {
      const at = m.index ?? 0, endAt = at + m[0].length;
      let n = parseAmount(m[2] ?? m[4]); if (m[3] || m[5]) n *= 1000;
      const after = text.slice(endAt, endAt + 14);
      const before = text.slice(Math.max(0, at - 40), at).toLowerCase();
      if (NEG.test(before)) continue; // quoting their ask back while refusing it
      if (/^\s*(upfront|up front|deposit|now|today|first|down)/i.test(after)) continue;
      if (UNIT.test(after) || /deposit|upfront|up front|anticipo|\bnow\b|first|part|instal|late fee|fee of|today|this week|per (hour|day)/.test(before)) continue;
      if (!sameCur(curOf(m[1] ?? m[6] ?? ""), t.currency)) continue;
      if (!Number.isFinite(n) || n <= 0) continue;
      if (n < t.minProject) { issues.push(`price ${m[0].trim()} is below the minimum`); continue; }
      // "10% off the MX$8,000" -> the real total is below the floor even though no total is written
      const d = discounts.find(x => x.at < at && at - x.at < 60 && /\b(off|on|of|from|sobre|del|de|on the|off the)\b[^.!?\d]{0,20}$/i.test(text.slice(x.at, at)));
      if (d && n * (1 - d.n / 100) < t.minProject) issues.push(`${d.n}% off ${m[0].trim()} comes to ${Math.round(n * (1 - d.n / 100))}, below the minimum`);
    }
  }
  return issues;
}

export function correctionLine(t: Terms) {
  const c = t.currency || "USD"; const bits: string[] = [];
  if (t.minProject !== undefined) bits.push(`my minimum for a project is ${fmt(t.minProject, c)}`);
  if (t.maxDiscount !== undefined) bits.push(t.maxDiscount === 0 ? "I don't offer discounts" : `the most I can take off is ${t.maxDiscount}%`);
  return bits.length ? `To be clear, ${bits.join(" and ")}.` : "";
}

/** Last resort: drop every sentence that breaks the terms, then state the real terms. */
export function enforceTerms(text: string, t: Terms) {
  const parts = text.match(/[^.!?\n]+(?:[.!?]+|\n+|$)/g) || [text];
  const kept = parts.filter((s, i) => !checkTerms(s, t).length && !(i > 0 && checkTerms(parts[i - 1] + s, t).length));
  return `${kept.join("").trim()}\n\n${correctionLine(t)}`.trim();
}
