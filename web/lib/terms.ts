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
  const cur = str(r.currency, 3)?.toUpperCase();
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

const UNIT = /^\s*(?:\/|per\s+|an?\s+|each\s+)?(?:h\b|hr|hour|day|week|month|item|page|unit)/i;
const SYMBOLS: Record<string, string> = { "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY", "₹": "INR", "R$": "BRL" };

/** Find prices below the floor and discounts above the limit. Hourly/day rates and deposits/part payments don't count. */
export function checkTerms(text: string, t: Terms) {
  const issues: string[] = [];
  if (t.minProject !== undefined && t.minProject > 0) {
    const re = /(R\$|[$€£¥₹]|\b[A-Z]{3}\s?)\s?(\d[\d,]*(?:\.\d+)?)(k?)|(\d[\d,]*(?:\.\d+)?)(k?)\s?(\b[A-Z]{3}\b|euros?|dollars?|pounds?)/g;
    for (const m of text.matchAll(re)) {
      const raw = (m[2] ?? m[4]).replace(/,/g, ""); let n = Number(raw); if (m[3] || m[5]) n *= 1000;
      const after = text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 14);
      const before = text.slice(Math.max(0, (m.index ?? 0) - 40), m.index).toLowerCase();
      if (UNIT.test(after) || /deposit|upfront|up front|now|first|part|instal|late fee|fee of|today|this week/.test(before)) continue;
      const code = (m[1] ?? m[6] ?? "").trim(); const cur = SYMBOLS[code] || (/^[A-Z]{3}$/.test(code) ? code : undefined);
      if (cur && t.currency && cur !== t.currency) continue;
      if (Number.isFinite(n) && n > 0 && n < t.minProject) issues.push(`price ${m[0].trim()} is below the minimum`);
    }
  }
  if (t.maxDiscount !== undefined) {
    for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s?%\s*(off|discount)|(discount|reduction)\s+of\s+(\d+(?:\.\d+)?)\s?%/gi)) {
      const n = Number(m[1] ?? m[4]); if (n > t.maxDiscount) issues.push(`${n}% discount is above the limit`);
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
