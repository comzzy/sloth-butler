"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FEATURES } from "@/lib/features";
import { IconLedger, IconNegotiate, IconProof, IconStyle, IconVoice } from "./icons";

type Style = "soft" | "firm" | "maybe-later";
type Language = "English" | "Nigerian Pidgin";
type Reply = { text: string; model: string; variant: string; latencyMs: number; fallback?: string };
type Side = Reply | { error: string };
type Ledger = { declines: number; minutesPer: number; totalMinutes: number };

const EXAMPLES = [
  "Hi! Could you join a 90 minute planning call on Saturday morning? We need everyone there.",
  "Can you help me move flat this weekend? It should only take the whole day.",
  "Quick one: can you review these three decks before tomorrow 9am?",
];
const LEDGER_KEY = "sloth-butler-ledger-v1";
const DEFAULT_LEDGER: Ledger = { declines: 0, minutesPer: 45, totalMinutes: 0 };

function Section({ n, children, className = "" }: { n: number; children: React.ReactNode; className?: string }) {
  const f = FEATURES[n - 1];
  const Icon = [IconNegotiate, IconStyle, IconVoice, IconLedger, IconProof][n - 1];
  return (
    <section id={f.id} className={`feature ${className}`} style={{ ["--c" as string]: f.color, ["--cd" as string]: f.dark, ["--ct" as string]: f.text }} aria-labelledby={`${f.id}-h`}>
      <header className="feature-head">
        <span className="mini-badge" aria-hidden="true"><Icon width="34" height="34" color="#fff" /></span>
        <span className="feature-num" aria-hidden="true">{n}</span>
        <div>
          <h2 id={`${f.id}-h`}>{f.title}</h2>
          <p className="feature-line">{f.line}</p>
        </div>
      </header>
      {children}
    </section>
  );
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
  const [evalMsg, setEvalMsg] = useState("Loading eval results...");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlCache = useRef(new Map<string, string>());

  useEffect(() => {
    try { const s = localStorage.getItem(LEDGER_KEY); if (s) setLedger({ ...DEFAULT_LEDGER, ...JSON.parse(s) }); } catch {}
    fetch("/api/eval").then(r => r.json()).then(d => d.ok ? setEvalData(d.results) : setEvalMsg(d.error)).catch(() => setEvalMsg("Could not load eval results."));
  }, []);
  const saveLedger = (l: Ledger) => { setLedger(l); try { localStorage.setItem(LEDGER_KEY, JSON.stringify(l)); } catch {} };

  const decline = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(""); setCopied(false); setVoiceState("idle"); setVoiceError("");
    if (request.trim().length < 5) { setError("Paste the request you want to decline first."); return; }
    setLoading(true);
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
    const input = request.trim() || EXAMPLES[0];
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

  return (
    <div className="app">
      <form onSubmit={decline} className="app-grid">
        <Section n={1}>
          <label htmlFor="req" className="label">The request you dread</label>
          <textarea id="req" value={request} onChange={e => setRequest(e.target.value)} maxLength={2000} rows={6}
            placeholder="Paste the meeting invite, favour or ask here." aria-describedby="req-help" />
          <div id="req-help" className="help">
            <span>{request.length}/2000</span>
            <span className="examples">Try:{" "}
              {EXAMPLES.map((x, i) => <button type="button" key={i} className="chip" onClick={() => setRequest(x)}>{["Weekend call", "Moving day", "Deck review"][i]}</button>)}
            </span>
          </div>
        </Section>

        <Section n={2}>
          <fieldset className="seg">
            <legend className="label">Style</legend>
            {(["soft", "firm", "maybe-later"] as Style[]).map(s => (
              <label key={s} className={style === s ? "on" : ""}><input type="radio" name="style" value={s} checked={style === s} onChange={() => setStyle(s)} />{s}</label>
            ))}
          </fieldset>
          <fieldset className="seg">
            <legend className="label">Language</legend>
            {(["English", "Nigerian Pidgin"] as Language[]).map(l => (
              <label key={l} className={language === l ? "on" : ""}><input type="radio" name="language" value={l} checked={language === l} onChange={() => setLanguage(l)} />{l}</label>
            ))}
          </fieldset>
          <button type="submit" className="primary" disabled={loading} aria-busy={loading}>
            {loading ? <><span className="spinner" aria-hidden="true" /> Writing your reply...</> : "Decline for me"}
          </button>
          {error && <p className="error" role="alert">{error}</p>}
        </Section>

        <Section n={3} className="reply-section">
          <div className="reply-card" aria-live="polite">
            {reply ? (
              <>
                <p className="reply-text">{reply.text}</p>
                <p className="meta">{words} words · {style} · {language} · {reply.variant === "finetune" ? "fine-tuned model" : "base model"} · {(reply.latencyMs / 1000).toFixed(1)}s</p>
                {reply.fallback && <p className="note">{reply.fallback}</p>}
                <div className="row">
                  <button type="button" className="secondary" onClick={copy}>{copied ? "Copied" : "Copy reply"}</button>
                  <button type="button" className="secondary" onClick={hear} disabled={voiceState === "loading"} aria-busy={voiceState === "loading"}>
                    {voiceState === "loading" ? "Preparing voice..." : voiceState === "playing" ? "Stop" : "Hear it"}
                  </button>
                </div>
                {voiceError && <p className="error" role="alert">{voiceError}</p>}
              </>
            ) : <p className="placeholder">Your reply will appear here. Press Hear it to have the butler read it aloud, followed by a short chime.</p>}
          </div>
        </Section>
      </form>

      <Section n={4}>
        <div className="ledger">
          <div className="stat"><span className="stat-num">{ledger.declines}</span><span className="stat-label">favours and meetings declined</span></div>
          <div className="stat"><span className="stat-num">{fmtMinutes(ledger.totalMinutes)}</span><span className="stat-label">estimated time kept</span></div>
        </div>
        <div className="assume">
          <label htmlFor="mins">Minutes each request would have cost you</label>
          <input id="mins" type="number" min={5} max={600} step={5} value={ledger.minutesPer}
            onChange={e => { const v = Math.max(5, Math.min(600, Number(e.target.value) || 5)); saveLedger({ ...ledger, minutesPer: v }); }} />
        </div>
        <p className="help-text">This is an estimate, not a measurement. Each decline adds the number above. Change it to match your week. The tally lives only in this browser.</p>
        <button type="button" className="link-btn" onClick={() => saveLedger({ ...DEFAULT_LEDGER, minutesPer: ledger.minutesPer })}>Reset ledger</button>
      </Section>

      <Section n={5}>
        <p className="help-text">Run the same request, style and language through the base model and the fine-tune. Uses the request above, or an example if it is empty.</p>
        <button type="button" className="secondary" onClick={runCompare} disabled={comparing} aria-busy={comparing}>{comparing ? "Running both models..." : "Compare base vs fine-tune"}</button>
        {compareError && <p className="error" role="alert">{compareError}</p>}
        {compare && (
          <div className="compare" aria-live="polite">
            {(["base", "finetune"] as const).map(k => {
              const s = compare[k];
              return (
                <div key={k} className={`compare-col ${k}`}>
                  <h3>{k === "base" ? "Base model" : "Fine-tuned"}</h3>
                  {"error" in s ? <p className="error">{s.error}</p> : <>
                    <p className="reply-text small">{s.text}</p>
                    <p className="meta">{s.text.split(/\s+/).length} words · {(s.latencyMs / 1000).toFixed(1)}s</p>
                  </>}
                </div>
              );
            })}
          </div>
        )}
        <EvalTable data={evalData} msg={evalMsg} />
      </Section>
    </div>
  );
}

const RULE_LABELS: Record<string, string> = { decline_first: "Declines in the first sentence", one_offer: "Exactly one counter-offer", max_80_words: "80 words or fewer", no_double_apology: "At most one apology", no_ai_tics: "No filler phrases", no_false_excuse: "No invented excuses", language_match: "Right language", style_match: "Right style" };

function pct(x: unknown) { return typeof x === "number" ? `${Math.round(x * 100)}%` : "n/a"; }
function num(x: unknown, d = 1) { return typeof x === "number" ? x.toFixed(d) : "n/a"; }

function EvalTable({ data, msg }: { data: any; msg: string }) {
  if (!data) return <p className="note">{msg}</p>;
  const b = data.base || {}, f = data.finetuned || {};
  const rows: [string, string, string][] = [
    ["Passes all rule checks", pct(b.pass_rate), pct(f.pass_rate)],
    ...Object.keys(f.per_rule || {}).map(k => [RULE_LABELS[k] ?? k.replace(/_/g, " "), pct(b.per_rule?.[k]), pct(f.per_rule?.[k])] as [string, string, string]),
    ["Average words", num(b.avg_words), num(f.avg_words)],
    ["Filler phrases per 100 replies", num(b.ai_tics_per_100), num(f.ai_tics_per_100)],
    ["Pidgin judged natural", pct(b.pidgin_correct_rate), pct(f.pidgin_correct_rate)],
    ["Median latency (s)", num(b.latency_s_median, 2), num(f.latency_s_median, 2)],
  ];
  const p = data.pairwise;
  return (
    <div className="table-wrap">
      <table>
        <caption>Held-out eval on {data.n_test ?? "?"} requests. Judge: {data.judge ?? "n/a"}.</caption>
        <thead><tr><th scope="col">Metric</th><th scope="col">Base</th><th scope="col">Fine-tuned</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r[0]}><th scope="row">{r[0]}</th><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
      </table>
      {p && <p className="meta">Side by side preference: fine-tune {p.finetuned_wins} of {p.n}, base {p.base_wins} of {p.n}.</p>}
    </div>
  );
}
