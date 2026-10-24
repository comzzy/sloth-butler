/** Browser-only storage for terms and follow-ups. */
import type { Terms } from "./terms";

export const TERMS_KEY = "sloth-butler-terms-v1";
export const FU_KEY = "sloth-butler-followups-v1";
export const FU_EVENT = "sloth-followups";

export type FuStep = { kind: string; title: string; offsetDays: number; text: string; sentAt?: string };
export type FuPlan = { id: number; createdAt: string; scenario: string; label: string; who: string; amount?: number; currency: string; steps: FuStep[]; paidAt?: string; closedAt?: string };

export function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? { ...fallback, ...JSON.parse(s) } : fallback; } catch { return fallback; }
}
export function loadPlans(): FuPlan[] {
  try { const s = localStorage.getItem(FU_KEY); const v = s ? JSON.parse(s) : []; return Array.isArray(v) ? v : []; } catch { return []; }
}
export function savePlans(p: FuPlan[]) {
  try { localStorage.setItem(FU_KEY, JSON.stringify(p)); } catch {}
  window.dispatchEvent(new Event(FU_EVENT));
}
export function saveTerms(t: Terms) { try { localStorage.setItem(TERMS_KEY, JSON.stringify(t)); } catch {} }

const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export function dueDate(p: FuPlan, s: FuStep) { const d = new Date(p.createdAt); d.setDate(d.getDate() + s.offsetDays); return d; }
/** "today" includes anything overdue and unsent. */
export function stepStatus(p: FuPlan, s: FuStep, now = new Date()): "done" | "today" | "upcoming" {
  if (s.sentAt || p.paidAt || p.closedAt) return "done";
  return day(dueDate(p, s)) <= day(now) ? "today" : "upcoming";
}
export function dueTodayCount(plans: FuPlan[]) {
  return plans.reduce((n, p) => n + p.steps.filter(s => stepStatus(p, s) === "today").length, 0);
}
export function termsActive(t: Terms) {
  return Boolean(t.name || t.rate || t.minProject || t.maxDiscount !== undefined || t.payment || t.lateFee || t.available);
}
