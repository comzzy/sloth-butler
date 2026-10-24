"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FEATURES } from "@/lib/features";
import type { Language, Scenario, Style } from "@/lib/prompt";
import { CURRENCIES, FOLLOWUP_SCENARIOS, SCENARIO_UI, money } from "@/lib/scenarios";
import type { Terms } from "@/lib/terms";
import { dueDate, FU_EVENT, loadPlans, savePlans, saveTerms, stepStatus, termsActive, TERMS_KEY, load, type FuPlan } from "@/lib/store";
import { Logo } from "./Logo";
import { IconFollow, IconLedger, IconNegotiate, IconProof, IconStyle, IconTerms, IconVoice } from "./icons";

type Reply = { text: string; model: string; variant: string; latencyMs: number; fallback?: string; terms?: boolean; guard?: { issues: string[]; action: string } };
type Side = Reply | { error: string };
type Entry = { id: number; ts: string; scenario: string; label: string; hours: number; amount: number; currency: string; recovered?: boolean };
type Ledger = { currency: string; entries: Entry[] };

const STYLES: { v: Style; d: string }[] = [{ v: "soft", d: "Warm and friendly" }, { v: "firm", d: "Short and direct" }, { v: "maybe-later", d: "Not now, names a later time" }];
const LANGS = ["English", "Spanish", "French", "Portuguese", "German", "Nigerian Pidgin"] as Language[];
const LEDGER_KEY = "sloth-butler-protected-v2";
const DEFAULT_LEDGER: Ledger = { currency: "USD", entries: [] };
const ICONS = [IconNegotiate, IconStyle, IconVoice, IconLedger, IconProof];
type Meta = { id: string; title: string; line: string; color: string; dark: string };
const TERMS_META: Meta = { id: "terms", title: "Your terms", line: "Your rate, your floor and how you get paid", color: "#E9B872", dark: "#C08F45" };
const FU_META: Meta = { id: "followups", title: "Follow-ups", line: "What's due today, what's next, what's done", color: "#6FB7D6", dark: "#4A93B3" };
const DEFAULT_TERMS: Terms = { currency: "USD", rateUnit: "hour" };

/** Adds .in when the element scrolls into view (once). */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!("IntersectionObserver" in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }: { as?: any; delay?: number; className?: string; children: React.ReactNode; [k: string]: any }) {
  const [ref, seen] = useInView<HTMLElement>();
  return <Tag ref={ref} className={`rv ${seen ? "in" : ""} ${className}`} style={{ ["--d" as string]: `${delay}ms`, ...(rest.style || {}) }} {...rest}>{children}</Tag>;
}

function useCountUp(target: number, run: boolean, ms = 1600) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!run) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = from.current; if (reduce || start === target) { setV(target); from.current = target; return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 4);
      setV(start + (target - start) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

function Card({ n, className = "", delay = 0, children, aside, meta, icon: IconOverride, step }: { n: number; className?: string; delay?: number; children: React.ReactNode; aside?: React.ReactNode; meta?: Meta; icon?: typeof IconTerms; step?: string }) {
  const f = meta ?? FEATURES[n - 1]; const Icon = IconOverride ?? ICONS[n - 1];
  return (
    <Reveal as="section" id={f.id} delay={delay} className={`card ${className}`} aria-labelledby={`${f.id}-h`}
      style={{ ["--c" as string]: f.color, ["--cd" as string]: f.dark }}>
      <header className="card-head">
        <span className="card-icon" aria-hidden="true"><Icon width="26" height="26" /></span>
        <div className="card-title">
          <span className="card-step">{step ?? `0${n}`}</span>
          <h3 id={`${f.id}-h`}>{f.title}</h3>
          <p>{f.line}</p>
        </div>
        {aside}
      </header>
      {children}
    </Reveal>
  );
}

function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true"><span className="ring r1" /><span className="ring r2" /><span className="empty-icon">{icon}</span></div>
      <p className="empty-title">{title}</p>
      <p className="empty-body">{body}</p>
    </div>
  );
}

function Thinking({ label }: { label: string }) {
  return (
    <div className="thinking" role="status">
      <span className="sloth-bob" aria-hidden="true"><Logo size={44} title="" /></span>
      <div>
        <p className="thinking-label">{label}<span className="dots" aria-hidden="true"><i /><i /><i /></span></p>
        <div className="shimmer" aria-hidden="true"><span /><span /><span /></div>
      </div>
    </div>
  );
}

function RevealText({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(/(\s+)/);
  return <p className={`reveal-text ${className}`} aria-label={text}>{words.map((w, i) => /\s+/.test(w) ? w : <span key={i} aria-hidden="true" style={{ ["--i" as string]: i / 2 }}>{w}</span>)}</p>;
}

function Wave({ on }: { on: boolean }) {
  return <span className={`wave ${on ? "on" : ""}`} aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</span>;
}


export function SlothApp() {
  const [scenario, setScenario] = useState<Scenario>("scope-creep");
  const [request, setRequest] = useState("");
  const [amount, setAmount] = useState("");
  const [terms, setTerms] = useState<Terms>(DEFAULT_TERMS);
  const [termsSaved, setTermsSaved] = useState(false);
  const [plans, setPlans] = useState<FuPlan[]>([]);
  const [fuDays, setFuDays] = useState(["3", "7", "14"]);
  const [fuWho, setFuWho] = useState("");
  const [fuLoading, setFuLoading] = useState(false);
  const [fuError, setFuError] = useState("");
  const [fuMsg, setFuMsg] = useState("");
  const [fuTab, setFuTab] = useState<"today" | "upcoming" | "done">("today");
  const [playing, setPlaying] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");
  const [style, setStyle] = useState<Style>("firm");
  const [language, setLanguage] = useState<Language>("English");
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [voiceError, setVoiceError] = useState("");
  const [dl, setDl] = useState(false);
  const [ledger, setLedger] = useState<Ledger>(DEFAULT_LEDGER);
  const [logHours, setLogHours] = useState("1");
  const [logAmount, setLogAmount] = useState("");
  const [saved, setSaved] = useState(false);
  const [compare, setCompare] = useState<{ base: Side; finetune: Side } | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [evalData, setEvalData] = useState<any>(null);
  const [evalMsg, setEvalMsg] = useState("Loading test results");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobCache = useRef(new Map<string, Blob>());
  const replyRef = useRef<HTMLDivElement | null>(null);
  const sc = SCENARIO_UI.find(s => s.id === scenario)!;

  useEffect(() => {
    try { const s = localStorage.getItem(LEDGER_KEY); if (s) setLedger({ ...DEFAULT_LEDGER, ...JSON.parse(s) }); } catch {}
    setTerms(load(TERMS_KEY, DEFAULT_TERMS));
    const up = () => setPlans(loadPlans()); up(); window.addEventListener(FU_EVENT, up);
    fetch("/api/eval").then(r => r.json()).then(d => d.ok ? setEvalData(d.results) : setEvalMsg(d.error)).catch(() => setEvalMsg("Couldn't load the test results."));
    return () => window.removeEventListener(FU_EVENT, up);
  }, []);
  const saveLedger = (l: Ledger) => { setLedger(l); try { localStorage.setItem(LEDGER_KEY, JSON.stringify(l)); } catch {} };

  const pickScenario = (id: Scenario) => {
    const next = SCENARIO_UI.find(s => s.id === id)!;
    setScenario(id); setLogHours(String(next.hours));
  };

  const generate = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(""); setCopied(false); setSaved(false); setVoiceState("idle"); setVoiceError(""); audioRef.current?.pause();
    if (request.trim().length < 5) { setError("Paste the message you received first."); return; }
    setLoading(true); setReply(null);
    if (window.innerWidth < 960) replyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      const r = await fetch("/api/decline", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, style, language, scenario, context: { deadline, notes: amount ? `amount involved: ${amount} ${terms.currency}` : undefined }, terms: termsActive(terms) ? terms : undefined }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong.");
      setReply(d);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [request, style, language, scenario, amount, deadline, terms]);

  const copy = async () => {
    if (!reply) return;
    try { await navigator.clipboard.writeText(reply.text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError("Could not copy. Select the text and copy it by hand."); }
  };

  const voiceBlob = async (text: string) => {
    let b = blobCache.current.get(text);
    if (!b) {
      const r = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Voice failed.");
      b = await r.blob(); blobCache.current.set(text, b);
    }
    return b;
  };

  const hear = async () => {
    if (!reply) return;
    if (voiceState === "playing") { audioRef.current?.pause(); setVoiceState("idle"); return; }
    setVoiceError(""); setVoiceState("loading");
    try {
      const a = new Audio(URL.createObjectURL(await voiceBlob(reply.text))); audioRef.current = a;
      a.onended = () => setVoiceState("idle");
      await a.play(); setVoiceState("playing");
    } catch (err) { setVoiceState("error"); setVoiceError((err as Error).message); }
  };

  const download = async () => {
    if (!reply) return;
    setVoiceError(""); setDl(true);
    try {
      const url = URL.createObjectURL(await voiceBlob(reply.text));
      const a = document.createElement("a"); a.href = url; a.download = `sloth-butler-reply-${Date.now()}.mp3`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) { setVoiceError((err as Error).message); }
    finally { setDl(false); }
  };

  const logIt = () => {
    if (!reply || saved) return;
    const hours = Math.max(0, Math.min(200, Number(logHours) || 0));
    const amount = Math.max(0, Math.min(1e9, Number(logAmount) || 0));
    const entry: Entry = { id: Date.now(), ts: new Date().toISOString(), scenario, label: sc.label, hours, amount, currency: ledger.currency };
    saveLedger({ ...ledger, entries: [entry, ...ledger.entries].slice(0, 200) });
    setSaved(true); setLogAmount("");
  };

  const runCompare = async () => {
    setCompareError("");
    const input = request.trim() || SCENARIO_UI[0].example;
    if (!request.trim()) setRequest(input);
    setComparing(true); setCompare(null);
    try {
      const r = await fetch("/api/decline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request: input, style, language, scenario, context: { deadline }, terms: termsActive(terms) ? terms : undefined, compare: true }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Comparison failed.");
      setCompare(d);
    } catch (err) { setCompareError((err as Error).message); }
    finally { setComparing(false); }
  };

  const setT = (k: keyof Terms, v: string) => {
    const numeric = ["rate", "minProject", "maxDiscount"].includes(k);
    setTerms(t => ({ ...t, [k]: numeric ? (v === "" ? undefined : Number(v)) : v })); setTermsSaved(false);
  };
  const storeTerms = (e: React.FormEvent) => {
    e.preventDefault(); saveTerms(terms); setTermsSaved(true);
    if (terms.currency && CURRENCIES.includes(terms.currency as any) && terms.currency !== ledger.currency) saveLedger({ ...ledger, currency: terms.currency });
  };
  const usingTerms = termsActive(terms);

  const planFollowups = async () => {
    setFuError(""); setFuMsg("");
    if (request.trim().length < 5) { setFuError("Paste their message first."); return; }
    setFuLoading(true);
    try {
      const r = await fetch("/api/followups", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, scenario, language, amount: Number(amount) || undefined, days: fuDays.map(Number), today: new Date().toLocaleDateString("en-CA"), terms: usingTerms ? terms : undefined }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't plan the follow-ups.");
      const plan: FuPlan = { id: Date.now(), createdAt: new Date().toISOString(), scenario, label: sc.label, who: fuWho.trim() || (scenario === "late-invoice" ? "Unpaid invoice" : "Waiting on a reply"),
        amount: Number(amount) || undefined, currency: terms.currency || ledger.currency, steps: d.steps };
      const next = [plan, ...loadPlans()].slice(0, 50); savePlans(next); setPlans(next);
      setFuMsg("Saved to your follow-ups board."); setFuTab(plan.steps.some(s => stepStatus(plan, s) === "today") ? "today" : "upcoming");
      setTimeout(() => document.getElementById("followups")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    } catch (err) { setFuError((err as Error).message); }
    finally { setFuLoading(false); }
  };
  const updatePlan = (id: number, f: (p: FuPlan) => FuPlan) => { const next = loadPlans().map(p => p.id === id ? f(p) : p); savePlans(next); setPlans(next); };
  const markSent = (id: number, i: number) => updatePlan(id, p => ({ ...p, steps: p.steps.map((s, j) => j === i ? { ...s, sentAt: s.sentAt ? undefined : new Date().toISOString() } : s) }));
  const markPaid = (p: FuPlan) => {
    updatePlan(p.id, q => ({ ...q, paidAt: new Date().toISOString() }));
    if (p.amount) {
      const entry: Entry = { id: Date.now(), ts: new Date().toISOString(), scenario: p.scenario, label: `Recovered: ${p.who}`, hours: 0, amount: p.amount, currency: p.currency, recovered: true };
      saveLedger({ ...ledger, entries: [entry, ...ledger.entries].slice(0, 200) });
    }
  };
  const removePlan = (id: number) => { const next = loadPlans().filter(p => p.id !== id); savePlans(next); setPlans(next); };
  const copyText = async (id: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1800); } catch {} };
  const playText = async (id: string, text: string) => {
    if (playing === id) { audioRef.current?.pause(); setPlaying(null); return; }
    audioRef.current?.pause(); setPlaying(id);
    try { const a = new Audio(URL.createObjectURL(await voiceBlob(text))); audioRef.current = a; a.onended = () => setPlaying(null); await a.play(); }
    catch (err) { setPlaying(null); setFuError((err as Error).message); }
  };
  const fuItems = plans.flatMap(p => p.steps.map((s, i) => ({ p, s, i, st: stepStatus(p, s), due: dueDate(p, s) })));
  const fuCounts = { today: 0, upcoming: 0, done: 0 } as Record<"today" | "upcoming" | "done", number>;
  fuItems.forEach(x => fuCounts[x.st]++);
  const fuShown = fuItems.filter(x => x.st === fuTab).sort((a, b) => a.due.getTime() - b.due.getTime());
  const canFollow = FOLLOWUP_SCENARIOS.includes(scenario);

  const words = reply ? reply.text.split(/\s+/).filter(Boolean).length : 0;
  const [ledgerRef, ledgerSeen] = useInView<HTMLDivElement>();
  const mine = ledger.entries.filter(e => e.currency === ledger.currency);
  const otherCur = ledger.entries.length - mine.length;
  const totHours = ledger.entries.reduce((s, e) => s + e.hours, 0);
  const totMoney = mine.reduce((s, e) => s + e.amount, 0);
  const recovered = mine.filter(e => e.recovered).reduce((s, e) => s + e.amount, 0);
  const nReplies = useCountUp(ledger.entries.length, ledgerSeen);
  const nHours = useCountUp(totHours, ledgerSeen);
  const nMoney = useCountUp(totMoney, ledgerSeen);

  return (
    <div className="stage">
      <div className="stage-inner">
        <Reveal className="stage-head" id="negotiate-top">
          <span className="eyebrow"><span className="eyebrow-dot" />Write a reply</span>
          <h2>Set your terms. Paste the message. Send the reply.</h2>
          <p>Save your rate, your minimum and how you like to be paid. Every reply uses those numbers and won&apos;t go below your floor. Then pick the kind of message and a tone.</p>
        </Reveal>

        <Card n={0} meta={TERMS_META} icon={IconTerms} step="Set once" className="terms-card" aside={usingTerms ? <span className="terms-chip">Saved</span> : null}>
          <form onSubmit={storeTerms} className="terms-form">
            <div className="tgrid">
              <label className="tf wide">Your name or business<input value={terms.name ?? ""} onChange={e => setT("name", e.target.value)} maxLength={60} placeholder="e.g. Maya Chen Studio" /></label>
              <label className="tf">Currency<select className="select" value={terms.currency ?? "USD"} onChange={e => setT("currency", e.target.value)}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label>
              <div className="tf">Rate<div className="tpair">
                <input type="number" min={0} inputMode="decimal" aria-label="Rate" value={terms.rate ?? ""} onChange={e => setT("rate", e.target.value)} placeholder="60" />
                <select className="select" aria-label="Per" value={terms.rateUnit ?? "hour"} onChange={e => setT("rateUnit", e.target.value)}><option value="hour">per hour</option><option value="day">per day</option></select>
              </div></div>
              <label className="tf">Minimum project price<input type="number" min={0} inputMode="decimal" value={terms.minProject ?? ""} onChange={e => setT("minProject", e.target.value)} placeholder="900" /></label>
              <label className="tf">Biggest discount you&apos;ll give (%)<input type="number" min={0} max={100} inputMode="numeric" value={terms.maxDiscount ?? ""} onChange={e => setT("maxDiscount", e.target.value)} placeholder="10" /></label>
              <label className="tf">Deposit or payment terms<input value={terms.payment ?? ""} onChange={e => setT("payment", e.target.value)} maxLength={80} placeholder="50% upfront, rest net 14" /></label>
              <label className="tf">Late fee<input value={terms.lateFee ?? ""} onChange={e => setT("lateFee", e.target.value)} maxLength={80} placeholder="2% per month after 14 days" /></label>
              <label className="tf wide">Next available<input value={terms.available ?? ""} onChange={e => setT("available", e.target.value)} maxLength={80} placeholder="from 10 November" /></label>
              <div className="terms-foot wide">
                <p className="fine">Kept in this browser. Sent with each reply so the counter-offer uses your real numbers and never goes under your floor.</p>
                <button type="submit" className="btn-secondary">{termsSaved ? "Saved ✓" : "Save my terms"}</button>
              </div>
            </div>
          </form>
        </Card>

        <form onSubmit={generate} className="studio">
          <div className="studio-left">
            <Card n={1} delay={0}>
              <fieldset className="opt">
                <legend className="label">What kind of message is it?</legend>
                <div className="scen-grid">
                  {SCENARIO_UI.map((s, i) => (
                    <label key={s.id} className={`scen ${scenario === s.id ? "on" : ""}`} style={{ ["--i" as string]: i }}>
                      <input type="radio" name="scenario" value={s.id} checked={scenario === s.id} onChange={() => pickScenario(s.id)} />
                      <strong>{s.label}</strong><span>{s.hint}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field">
                <label htmlFor="req" className="label">Their message</label>
                <textarea id="req" value={request} onChange={e => setRequest(e.target.value)} maxLength={2000} rows={5}
                  placeholder="Paste the email, DM or text you received." aria-describedby="req-help" />
                <div id="req-help" className="field-foot">
                  {sc.example ? <button type="button" className="chip" onClick={() => setRequest(sc.example)}>Use an example</button> : <span />}
                  <span className="count">{request.length}/2000</span>
                </div>
              </div>
              <div className="ctx">
                <div><label htmlFor="amount" className="label">Amount involved ({terms.currency || "USD"}) <em>optional</em></label>
                  <input id="amount" type="number" min={0} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1200" /></div>
                <div><label htmlFor="deadline" className="label">Deadline or timing <em>optional</em></label>
                  <input id="deadline" type="text" value={deadline} onChange={e => setDeadline(e.target.value)} maxLength={80} placeholder="e.g. invoice due 3 March" /></div>
              </div>
            </Card>

            <Card n={2} delay={120}>
              <fieldset className="opt">
                <legend className="label">Tone</legend>
                <div className="opt-grid three">
                  {STYLES.map(s => (
                    <label key={s.v} className={`opt-item ${style === s.v ? "on" : ""}`}>
                      <input type="radio" name="style" value={s.v} checked={style === s.v} onChange={() => setStyle(s.v)} />
                      <strong>{s.v}</strong><span>{s.d}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="opt">
                <label htmlFor="lang" className="label">Language</label>
                <select id="lang" className="select" value={language} onChange={e => setLanguage(e.target.value as Language)}>
                  {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={loading} aria-busy={loading}>
                {loading ? <><span className="spinner" aria-hidden="true" />Writing…</> : <>Write my reply<span className="arrow" aria-hidden="true">→</span></>}
              </button>
              {error && <p className="error" role="alert">{error}</p>}
            </Card>
          </div>

          <div className="studio-right" ref={replyRef}>
            <Card n={3} delay={240} className="reply-card">
              <div className="reply-body" aria-live="polite">
                {loading ? <Thinking label="Writing your reply" /> : reply ? (
                  <div className="reply-filled" key={reply.text}>
                    <div className="bubble"><RevealText text={reply.text} /></div>
                    {reply.terms && <p className="terms-chip on" title={reply.guard ? `Checked against your floor: ${reply.guard.issues.join(", ")}` : undefined}><span aria-hidden="true">✓</span>Using your terms{reply.guard && (reply.guard.action === "regenerated" ? " · rewritten to keep your floor" : " · floor added")}</p>}
                    <ul className="tags">
                      <li>{sc.label}</li><li>{style}</li><li>{language}</li><li>{words} words</li><li>{(reply.latencyMs / 1000).toFixed(1)}s</li>
                    </ul>
                    {reply.fallback && <p className="note">{reply.fallback}</p>}
                    <div className="actions">
                      <button type="button" className="btn-ghost strong" onClick={copy}>{copied ? "Copied" : "Copy reply"}</button>
                      <button type="button" className="btn-ghost" onClick={() => generate()}>Write another</button>
                    </div>
                    <div className="player">
                      <button type="button" className={`play ${voiceState}`} onClick={hear} disabled={voiceState === "loading"} aria-busy={voiceState === "loading"} aria-label={voiceState === "playing" ? "Stop" : "Play voice"}>
                        {voiceState === "loading" ? <span className="spinner dark" /> : voiceState === "playing" ? <span className="stop-ico" /> : <span className="play-ico" />}
                      </button>
                      <div className="player-mid">
                        <strong>{voiceState === "loading" ? "Loading audio" : voiceState === "playing" ? "Playing" : "Play voice"}</strong>
                        <span>Alice, ElevenLabs</span>
                      </div>
                      <Wave on={voiceState === "playing"} />
                      <button type="button" className="btn-ghost sm dl" onClick={download} disabled={dl} aria-busy={dl}>{dl ? "Preparing…" : "Download mp3"}</button>
                    </div>
                    {voiceError && <p className="error" role="alert">{voiceError}</p>}
                    {canFollow && (
                      <div className="planbox">
                        <p className="logbox-h">No answer yet? Plan follow-ups.</p>
                        <p className="fine">A friendly nudge, a firmer reminder and a final notice{terms.lateFee ? " with your late fee" : ""}. Days after today:</p>
                        <div className="planbox-row">
                          <label className="wide">Who or what<input value={fuWho} onChange={e => setFuWho(e.target.value)} maxLength={60} placeholder="e.g. Invoice #104, Acme" /></label>
                          {["Nudge", "Reminder", "Final"].map((l, i) => (
                            <label key={l}>{l}<input type="number" min={0} max={365} value={fuDays[i]} onChange={e => setFuDays(d => d.map((x, j) => j === i ? e.target.value : x))} /></label>
                          ))}
                        </div>
                        <button type="button" className="btn-secondary" onClick={planFollowups} disabled={fuLoading} aria-busy={fuLoading}>{fuLoading ? <><span className="spinner" />Planning…</> : "Plan follow-ups"}</button>
                        {fuError && <p className="error" role="alert">{fuError}</p>}
                        {fuMsg && <p className="note">{fuMsg} <a href="#followups">See the board</a></p>}
                      </div>
                    )}
                    <div className="logbox">
                      <p className="logbox-h">Sending it? Log what it protected.</p>
                      <div className="logbox-row">
                        <label>Hours<input type="number" min={0} max={200} step={0.5} value={logHours} onChange={e => setLogHours(e.target.value)} /></label>
                        <label>{sc.ask} ({ledger.currency})<input type="number" min={0} step={1} value={logAmount} onChange={e => setLogAmount(e.target.value)} placeholder="0" /></label>
                        <button type="button" className="btn-secondary" onClick={logIt} disabled={saved}>{saved ? "Logged ✓" : "Save to log"}</button>
                      </div>
                    </div>
                  </div>
                ) : <Empty icon={<IconNegotiate width="34" height="34" />} title="Your reply shows up here" body="Pick the situation, paste their message and press Write my reply." />}
              </div>
            </Card>
          </div>
        </form>

        <Reveal className="stage-head sub" delay={0}>
          <span className="eyebrow"><span className="eyebrow-dot" />Follow-ups</span>
          <h2>Nothing slips</h2>
          <p>Late invoices and &ldquo;I&apos;ll get back to you&rdquo; replies get a three-step plan. Send each one when it&apos;s due and mark it sent.</p>
        </Reveal>

        <Card n={0} meta={FU_META} icon={IconFollow} step="Board" className="fu-card">
          <div className="fu-tabs" role="tablist">
            {(["today", "upcoming", "done"] as const).map(t => (
              <button key={t} type="button" role="tab" aria-selected={fuTab === t} className={`chip ${fuTab === t ? "on" : ""}`} onClick={() => setFuTab(t)}>
                {t === "today" ? "Due today" : t === "upcoming" ? "Upcoming" : "Done"}<span className="fu-n">{fuCounts[t]}</span>
              </button>
            ))}
          </div>
          {fuShown.length ? (
            <ul className={`fu-list${fuShown.length === 1 ? " single" : ""}`}>
              {fuShown.map(({ p, s, i, st, due }, k) => {
                const id = `${p.id}-${i}`;
                return (
                  <li key={id} className={`fu-item ${st}`} style={{ ["--i" as string]: k }}>
                    <div className="fu-top">
                      <span className={`fu-step s${i}`}>{i + 1}/3 · {s.title}</span>
                      <strong className="fu-who">{p.who}{p.amount ? ` · ${money(p.amount, p.currency)}` : ""}</strong>
                      <span className="fu-due">{p.paidAt ? "Paid" : s.sentAt ? `Sent ${new Date(s.sentAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : st === "today" ? "Due today" : `Due ${due.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}`}</span>
                    </div>
                    <p className="fu-text">{s.text}</p>
                    <div className="fu-actions">
                      <button type="button" className="btn-ghost sm" onClick={() => copyText(id, s.text)}>{copiedId === id ? "Copied" : "Copy"}</button>
                      <button type="button" className="btn-ghost sm" onClick={() => playText(id, s.text)} aria-pressed={playing === id}>{playing === id ? "Stop" : "Voice note"}</button>
                      {!p.paidAt && <button type="button" className="btn-ghost sm strong" onClick={() => markSent(p.id, i)}>{s.sentAt ? "Undo sent" : "Mark sent"}</button>}
                      {!p.paidAt && p.scenario === "late-invoice" && <button type="button" className="btn-ghost sm" onClick={() => markPaid(p)}>Mark paid</button>}
                      {(p.paidAt || st === "done") && i === p.steps.length - 1 && <button type="button" className="btn-ghost sm" onClick={() => removePlan(p.id)}>Remove</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <Empty icon={<IconFollow width="34" height="34" />} title={fuTab === "today" ? "Nothing due today" : fuTab === "upcoming" ? "Nothing coming up" : "Nothing done yet"}
              body={plans.length ? "Check the other tabs." : "Pick \u201cLate or unpaid invoice\u201d or \u201cI'll get back to you\u201d, write a reply, then press Plan follow-ups."} />}
          <p className="fine">Saved in this browser only. Marking an invoice paid adds it to your log as money recovered.</p>
        </Card>

        <Reveal className="stage-head sub" delay={0}>
          <span className="eyebrow"><span className="eyebrow-dot" />Your log</span>
          <h2>What you protected</h2>
          <p>Each reply you save adds the hours and money you kept. It stays in this browser.</p>
        </Reveal>

        <Card n={4} className="ledger-card" aside={
          <div className="ledger-ctl">
            <label className="sr" htmlFor="cur">Currency</label>
            <select id="cur" className="select sm" value={ledger.currency} onChange={e => saveLedger({ ...ledger, currency: e.target.value })}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" className="btn-ghost sm" onClick={() => { if (confirm("Clear your log?")) saveLedger({ ...DEFAULT_LEDGER, currency: ledger.currency }); }}>Reset</button>
          </div>}>
          <div ref={ledgerRef} className="stats three">
            <div className="stat"><span className="stat-num">{money(Math.round(nMoney), ledger.currency)}</span><span className="stat-label">Money protected</span></div>
            <div className="stat"><span className="stat-num">{nHours.toFixed(nHours % 1 && totHours % 1 ? 1 : 0)}h</span><span className="stat-label">Hours protected</span></div>
            <div className="stat"><span className="stat-num">{Math.round(nReplies)}</span><span className="stat-label">Replies saved</span></div>
          </div>
          <div className="meter" aria-hidden="true"><span style={{ width: ledgerSeen ? `${Math.min(100, (totHours / 40) * 100)}%` : 0 }} /></div>
          <p className="meter-cap">{totHours >= 40 ? "That's a full work week you kept." : `${Math.max(0, 40 - totHours).toFixed(totHours % 1 ? 1 : 0)}h to a full work week`}</p>
          {ledger.entries.length ? (
            <ul className="log-list">
              {ledger.entries.slice(0, 6).map((e, i) => (
                <li key={e.id} style={{ ["--i" as string]: i }}>
                  <span className="log-what">{e.label}</span>
                  <span className="log-date">{new Date(e.ts).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                  <span className="log-val">{e.hours}h · {money(e.amount, e.currency)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="fine">Nothing logged yet. Write a reply and press Save to log.</p>}
          {recovered > 0 && <p className="fine recovered">Includes {money(recovered, ledger.currency)} recovered from invoices marked paid.</p>}
          {otherCur > 0 && <p className="fine">{otherCur} saved {otherCur === 1 ? "entry is" : "entries are"} in another currency and not in the money total.</p>}
          <p className="fine">Saved in this browser only. Nothing is sent to a server.</p>
        </Card>

        <Reveal className="stage-head sub" delay={0}>
          <span className="eyebrow"><span className="eyebrow-dot" />Why a trained model</span>
          <h2>Before and after training</h2>
          <p>Sloth Butler runs on Qwen3-8B with a small adapter trained for this one job. Try the same message on both.</p>
        </Reveal>

        <Card n={5} className="proof-card">
          <div className="proof-top">
            <p className="muted">Same message, same open model. Left is before training, right is after.</p>
            <button type="button" className="btn-secondary" onClick={runCompare} disabled={comparing} aria-busy={comparing}>{comparing ? <><span className="spinner" />Running…</> : "Compare with the untrained model"}</button>
          </div>
          {compareError && <p className="error" role="alert">{compareError}</p>}
          <div className="compare" aria-live="polite">
            {(["base", "finetune"] as const).map(k => {
              const s = compare?.[k];
              return (
                <div key={k} className={`compare-col ${k}`}>
                  <div className="compare-head"><span className="pill">{k === "base" ? "Before training (plain Qwen3-8B)" : "After training (Sloth Butler)"}</span>{s && !("error" in s) && <span className="muted sm">{s.text.split(/\s+/).length} words · {(s.latencyMs / 1000).toFixed(1)}s</span>}</div>
                  {comparing ? <div className="shimmer tall" aria-hidden="true"><span /><span /><span /></div>
                    : s ? ("error" in s ? <p className="error">{s.error}</p> : <RevealText text={s.text} className="small" />)
                    : <p className="ghost-line">{k === "base" ? "Untrained reply goes here" : "Trained reply goes here"}</p>}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="eval-wrap"><EvalPanel data={evalData} msg={evalMsg} /></div>
      </div>
    </div>
  );
}

const RULE_LABELS: Record<string, string> = { decline_first: "Says no right away", one_offer: "Offers exactly one alternative", max_80_words: "Short (80 words or less)", no_double_apology: "Doesn't over-apologise", no_ai_tics: "No robotic filler", no_false_excuse: "Doesn't make up excuses", language_match: "Replies in the right language", style_match: "Matches the tone you picked" };
const pct = (x: unknown) => typeof x === "number" ? `${Math.round(x * 100)}%` : "n/a";
const num = (x: unknown, d = 1) => typeof x === "number" ? x.toFixed(d) : "n/a";

function EvalPanel({ data, msg }: { data: any; msg: string }) {
  const f5 = FEATURES[4];
  if (data) return <EvalScores data={data} />;
  return <div className="eval card" style={{ ["--c" as string]: f5.color }}><Empty icon={<IconProof width="34" height="34" />} title="Test results" body={msg} /></div>;
}

function EvalScores({ data }: { data: any }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const f5 = FEATURES[4];
  const b = data.base || {}, f = data.finetuned || {};
  const rows: [string, number, number][] = [["Gets everything right", b.pass_rate, f.pass_rate], ...Object.keys(f.per_rule || {}).map(k => [RULE_LABELS[k] ?? k.replace(/_/g, " "), b.per_rule?.[k], f.per_rule?.[k]] as [string, number, number])];
  if (typeof f.pidgin_correct_rate === "number") rows.push(["Pidgin replies judged natural", b.pidgin_correct_rate, f.pidgin_correct_rate]);
  const p = data.pairwise;
  const tiles: [string, string, string][] = [["Words per reply", num(b.avg_words), num(f.avg_words)], ["Robotic phrases per 100 replies", num(b.ai_tics_per_100), num(f.ai_tics_per_100)], ["Time to reply", `${num(b.latency_s_median, 2)}s`, `${num(f.latency_s_median, 2)}s`]];
  return (
    <Reveal className="eval card" style={{ ["--c" as string]: f5.color, ["--cd" as string]: f5.dark }} delay={0}>
      <div ref={ref} className={`eval-in ${seen ? "seen" : ""}`}>
        <header className="eval-head">
          <div><span className="card-step">Test results</span><h3>Tested on {data.n_test ?? "?"} requests it never saw</h3><p className="muted sm">Scored by rule checks and a second model ({data.judge ?? "n/a"})</p></div>
          <div className="legend"><span><i className="sw base" />Before training</span><span><i className="sw ft" />After training</span></div>
        </header>
        <div className="eval-grid">
          <div className="bars">
            {rows.map(([label, bv, fv], i) => (
              <div className="bar-row" key={label} style={{ ["--i" as string]: i }}>
                <span className="bar-label">{label}</span>
                <div className="bar-pair">
                  <div className="bar base"><span style={{ ["--w" as string]: `${(bv ?? 0) * 100}%` }} /><em>{pct(bv)}</em></div>
                  <div className="bar ft"><span style={{ ["--w" as string]: `${(fv ?? 0) * 100}%` }} /><em>{pct(fv)}</em></div>
                </div>
              </div>
            ))}
          </div>
          <div className="side">
            {p && <div className="win"><span className="win-num">{p.finetuned_wins}<small>/{p.n}</small></span><span className="stat-label">Times the judge picked the trained reply</span>
              <div className="split"><span style={{ ["--w" as string]: `${(p.finetuned_wins / p.n) * 100}%` }} /></div></div>}
            {tiles.map(([l, bv, fv]) => <div className="tile" key={l}><span className="stat-label">{l}</span><div><span className="muted">{bv}</span><span className="to">→</span><strong>{fv}</strong></div></div>)}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
