import type { Scenario } from "./prompt";

export const SCENARIO_UI: { id: Scenario; label: string; hint: string; example: string; hours: number; ask: string }[] = [
  { id: "scope-creep", label: "Free extra work", hint: "A client wants more than you agreed", hours: 4, ask: "Value of the extra work",
    example: "Hi! Love the homepage. Since you're already in there, could you also build out the blog and a pricing page? Shouldn't take long, and we'd really appreciate it." },
  { id: "discount", label: "Discount request", hint: "Someone wants your price lower", hours: 1, ask: "Discount you didn't give",
    example: "Your quote looks good but it's a bit above our budget. Can you do 30% off? We'd send more work your way later." },
  { id: "late-invoice", label: "Late or unpaid invoice", hint: "You're owed money and it's overdue", hours: 1, ask: "Amount you asked for",
    example: "Sorry, things have been hectic here. Can we push the invoice to next month? Cash flow is tight right now." },
  { id: "credit", label: "Pay later / credit", hint: "A buyer wants it now and to pay later", hours: 0.5, ask: "Amount not given on credit",
    example: "Can you send the order today and I'll pay you at the end of the month? I'm good for it, promise." },
  { id: "favour", label: "Last-minute favour", hint: "A call or task with no notice", hours: 2, ask: "Value of the time",
    example: "Are you free for a quick call in 30 minutes? I want to pick your brain about our launch plan." },
  { id: "other", label: "Something else", hint: "Any request you'd rather not accept as asked", hours: 1, ask: "Value protected",
    example: "" },
];

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "BRL", "ZAR", "MXN", "CHF", "SGD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function money(n: number, c: string) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: n % 1 === 0 || Math.abs(n) >= 1000 ? 0 : 2 }).format(n); }
  catch { return `${c} ${n.toFixed(0)}`; }
}
