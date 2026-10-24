"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FEATURES } from "@/lib/features";
import { Logo } from "./Logo";
import { IconLedger, IconNegotiate, IconProof, IconStyle, IconVoice } from "./icons";

type Style = "soft" | "firm" | "maybe-later";
type Language = "English" | "Nigerian Pidgin";
type Reply = { text: string; model: string; variant: string; latencyMs: number; fallback?: string };
type Side = Reply | { error: string };
type Ledger = { declines: number; minutesPer: number; totalMinutes: number };

const EXAMPLES = [
  ["Weekend call", "Hi! Could you join a 90 minute planning call on Saturday morning? We need everyone there."],
  ["Moving day", "Can you help me move flat this weekend? It should only take the whole day."],
  ["Deck review", "Quick one: can you review these three decks before tomorrow 9am?"],
] as const;
const STYLES: { v: Style; d: string }[] = [{ v: "soft", d: "Friendly" }, { v: "firm", d: "Short, no wiggle room" }, { v: "maybe-later", d: "Not now, maybe later" }];
const LEDGER_KEY = "sloth-butler-ledger-v1";
const DEFAULT_LEDGER: Ledger = { declines: 0, minutesPer: 45, totalMinutes: 0 };
const ICONS = [IconNegotiate, IconStyle, IconVoice, IconLedger, IconProof];

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

function Card({ n, className = "", delay = 0, children, aside }: { n: number; className?: string; delay?: number; children: React.ReactNode; aside?: React.ReactNode }) {
  const f = FEATURES[n - 1]; const Icon = ICONS[n - 1];
  return (
    <Reveal as="section" id={f.id} delay={delay} className={`card ${className}`} aria-labelledby={`${f.id}-h`}
      style={{ ["--c" as string]: f.color, ["--cd" as string]: f.dark }}>
      <header className="card-head">
        <span className="card-icon" aria-hidden="true"><Icon width="26" height="26" /></span>
        <div className="card-title">
          <span className="card-step">0{n}</span>
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

function fmtMinutes(m: number) {
  const h = Math.floor(m / 60), r = Math.round(m % 60);
  return h ? `${h}h ${r}m` : `${r}m`;
}

export function SlothApp() {
  const [request, setRequest] = useState("");
  const [style, setStyle] = useState<Style>("soft");
  const [language, setLanguage] = useState<Language>("English");
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [voiceError, setVoiceError] = useState("");
  const [ledger, setLedger] = useState<Ledger>(DEFAULT_LEDGER);
  const [compare, setCompare] = useState<{ base: Side; finetune: Side } | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [evalData, setEvalData] = useState<any>(null);
  const [evalMsg, setEvalMsg] = useState("Loading test results");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlCache = useRef(new Map<string, string>());
  const replyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { const s = localStorage.getItem(LEDGER_KEY); if (s) setLedger({ ...DEFAULT_LEDGER, ...JSON.parse(s) }); } catch {}
    fetch("/api/eval").then(r => r.json()).then(d => d.ok ? setEvalData(d.results) : setEvalMsg(d.error)).catch(() => setEvalMsg("Couldn't load the test results."));
  }, []);
  const saveLedger = (l: Ledger) => { setLedger(l); try { localStorage.setItem(LEDGER_KEY, JSON.stringify(l)); } catch {} };

  const decline = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(""); setCopied(false); setVoiceState("idle"); setVoiceError(""); audioRef.current?.pause();
    if (request.trim().length < 5) { setError("Paste a request first."); return; }
    setLoading(true); setReply(null);
    if (window.innerWidth < 960) replyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      const r = await fetch("/api/decline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request, style, language }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong.");
      setReply(d);
      setLedger(prev => { const l = { ...prev, declines: prev.declines + 1, totalMinutes: prev.totalMinutes + prev.minutesPer }; try { localStorage.setItem(LEDGER_KEY, JSON.stringify(l)); } catch {} return l; });
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [request, style, language]);

  const copy = async () => {
    if (!reply) return;
    try { await navigator.clipboard.writeText(reply.text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError("Could not copy. Select the text and copy it by hand."); }
  };

  const hear = async () => {
    if (!reply) return;
    if (voiceState === "playing") { audioRef.current?.pause(); setVoiceState("idle"); return; }
    setVoiceError(""); setVoiceState("loading");
    try {
      let url = urlCache.current.get(reply.text);
      if (!url) {
        const r = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: reply.text }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Voice failed.");
        url = URL.createObjectURL(await r.blob());
        urlCache.current.set(reply.text, url);
      }
      const a = new Audio(url); audioRef.current = a;
      a.onended = () => {
        const chime = new Audio("/audio/declined-chime.mp3"); chime.volume = 0.7; audioRef.current = chime;
        chime.onended = () => setVoiceState("idle");
        chime.play().catch(() => setVoiceState("idle"));
      };
      await a.play(); setVoiceState("playing");
    } catch (err) { setVoiceState("error"); setVoiceError((err as Error).message); }
  };

  const runCompare = async () => {
    setCompareError("");
    const input = request.trim() || EXAMPLES[0][1];
    if (!request.trim()) setRequest(input);
    setComparing(true); setCompare(null);
    try {
      const r = await fetch("/api/decline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request: input, style, language, compare: true }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Comparison failed.");
      setCompare(d);
    } catch (err) { setCompareError((err as Error).message); }
    finally { setComparing(false); }
  };

  const words = reply ? reply.text.split(/\s+/).filter(Boolean).length : 0;
  const [ledgerRef, ledgerSeen] = useInView<HTMLDivElement>();
  const nDecl = useCountUp(ledger.declines, ledgerSeen);
  const nMin = useCountUp(ledger.totalMinutes, ledgerSeen);
  const hours = ledger.totalMinutes / 60;

  return (
    <div className="stage">
      <div className="stage-inner">
        <Reveal className="stage-head" id="negotiate-top">
          <span className="eyebrow"><span className="eyebrow-dot" />Try it</span>
          <h2>Paste it in, get a no back.</h2>
          <p>Pick a tone and a language. The reply is usually under 30 words.</p>
        </Reveal>

        <form onSubmit={decline} className="studio">
          <div className="studio-left">
            <Card n={1} delay={0}>
              <div className="field">
                <label htmlFor="req" className="label">The request</label>
                <textarea id="req" value={request} onChange={e => setRequest(e.target.value)} maxLength={2000} rows={6}
                  placeholder="Paste the message here." aria-describedby="req-help" />
                <div id="req-help" className="field-foot">
                  <div className="examples">
                    <span className="muted">Examples</span>
                    {EXAMPLES.map(([k, x]) => <button type="button" key={k} className={`chip ${request === x ? "on" : ""}`} onClick={() => setRequest(x)}>{k}</button>)}
                  </div>
                  <span className="count">{request.length}/2000</span>
                </div>
              </div>
            </Card>

            <Card n={2} delay={120}>
              <fieldset className="opt">
                <legend className="label">Style</legend>
                <div className="opt-grid three">
                  {STYLES.map(s => (
                    <label key={s.v} className={`opt-item ${style === s.v ? "on" : ""}`}>
                      <input type="radio" name="style" value={s.v} checked={style === s.v} onChange={() => setStyle(s.v)} />
                      <strong>{s.v}</strong><span>{s.d}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="opt">
                <legend className="label">Language</legend>
                <div className="seg2" data-pos={language === "English" ? 0 : 1}>
                  <span className="seg2-thumb" aria-hidden="true" />
                  {(["English", "Nigerian Pidgin"] as Language[]).map(l => (
                    <label key={l} className={language === l ? "on" : ""}><input type="radio" name="language" value={l} checked={language === l} onChange={() => setLanguage(l)} />{l}</label>
                  ))}
                </div>
              </fieldset>
              <button type="submit" className="btn-primary" disabled={loading} aria-busy={loading}>
                {loading ? <><span className="spinner" aria-hidden="true" />Writing…</> : <>Write my no<span className="arrow" aria-hidden="true">→</span></>}
              </button>
              {error && <p className="error" role="alert">{error}</p>}
            </Card>
          </div>

          <div className="studio-right" ref={replyRef}>
            <Card n={3} delay={240} className="reply-card">
              <div className="reply-body" aria-live="polite">
                {loading ? <Thinking label="Writing" /> : reply ? (
                  <div className="reply-filled" key={reply.text}>
                    <div className="bubble"><RevealText text={reply.text} /></div>
                    <ul className="tags">
                      <li>{words} words</li><li>{style}</li><li>{language}</li>
                      <li>{reply.variant === "finetune" ? "After training" : "Before training"}</li><li>{(reply.latencyMs / 1000).toFixed(1)}s</li>
                    </ul>
                    {reply.fallback && <p className="note">{reply.fallback}</p>}
                    <div className="player">
                      <button type="button" className={`play ${voiceState}`} onClick={hear} disabled={voiceState === "loading"} aria-busy={voiceState === "loading"} aria-label={voiceState === "playing" ? "Stop" : "Hear it"}>
                        {voiceState === "loading" ? <span className="spinner dark" /> : voiceState === "playing" ? <span className="stop-ico" /> : <span className="play-ico" />}
                      </button>
                      <div className="player-mid">
                        <strong>{voiceState === "loading" ? "Loading audio" : voiceState === "playing" ? "Playing" : "Play"}</strong>
                        <span>ElevenLabs voice: Alice</span>
                      </div>
                      <Wave on={voiceState === "playing"} />
                    </div>
                    <div className="actions">
                      <button type="button" className="btn-ghost" onClick={copy}>{copied ? "Copied" : "Copy reply"}</button>
                      <button type="button" className="btn-ghost" onClick={() => decline()}>Try again</button>
                    </div>
                    {voiceError && <p className="error" role="alert">{voiceError}</p>}
                  </div>
                ) : <Empty icon={<IconVoice width="34" height="34" />} title="No reply yet" body="Write one on the left. You can play it out loud after." />}
              </div>
            </Card>
          </div>
        </form>

        <Reveal className="stage-head sub" delay={0}>
          <span className="eyebrow"><span className="eyebrow-dot" />Your numbers</span>
          <h2>Time saved, and does it work?</h2>
        </Reveal>

        <div className="dash">
          <Card n={4} className="ledger-card" aside={<button type="button" className="btn-ghost sm" onClick={() => saveLedger({ ...DEFAULT_LEDGER, minutesPer: ledger.minutesPer })}>Reset</button>}>
            <div ref={ledgerRef} className="stats">
              <div className="stat"><span className="stat-num">{Math.round(nDecl)}</span><span className="stat-label">Requests turned down</span></div>
              <div className="stat"><span className="stat-num">{fmtMinutes(nMin)}</span><span className="stat-label">Time saved (rough guess)</span></div>
            </div>
            <div className="meter" aria-hidden="true"><span style={{ width: ledgerSeen ? `${Math.min(100, (hours / 8) * 100)}%` : 0 }} /></div>
            <p className="meter-cap">{hours >= 8 ? "That's a full work day." : `${fmtMinutes(Math.max(0, 480 - ledger.totalMinutes))} until a full work day`}</p>
            <div className="stepper">
              <label htmlFor="mins">Minutes one request would take you</label>
              <div className="stepper-ctl">
                <button type="button" aria-label="Less" onClick={() => saveLedger({ ...ledger, minutesPer: Math.max(5, ledger.minutesPer - 5) })}>−</button>
                <input id="mins" type="number" min={5} max={600} step={5} value={ledger.minutesPer}
                  onChange={e => { const v = Math.max(5, Math.min(600, Number(e.target.value) || 5)); saveLedger({ ...ledger, minutesPer: v }); }} />
                <button type="button" aria-label="More" onClick={() => saveLedger({ ...ledger, minutesPer: Math.min(600, ledger.minutesPer + 5) })}>+</button>
              </div>
            </div>
            <p className="fine">Saved in this browser only.</p>
          </Card>

          <Card n={5} delay={120} className="proof-card">
            <div className="proof-top">
              <p className="muted">Same request, same open model. Left is before we trained it, right is after.</p>
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
        </div>

        <EvalPanel data={evalData} msg={evalMsg} />
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
  if (typeof f.pidgin_correct_rate === "number") rows.push(["Pidgin sounds natural", b.pidgin_correct_rate, f.pidgin_correct_rate]);
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
