"use client";
import { useEffect, useRef, useState } from "react";

export function Reveal({ delay = 0, className = "", children, as: Tag = "div", ...rest }: { delay?: number; className?: string; children: React.ReactNode; as?: any; [k: string]: any }) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!("IntersectionObserver" in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`rv ${seen ? "in" : ""} ${className}`} style={{ ["--d" as string]: `${delay}ms`, ...(rest.style || {}) }} {...rest}>{children}</Tag>;
}

export function Sample({ text, lang }: { text: string; lang: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* ignore */ }
  }
  return (
    <div className="g-sample">
      <div><span className="g-lang">{lang}</span><p>{text}</p></div>
      <button type="button" className="btn-ghost sm" onClick={copy} aria-label={`Copy: ${text}`}>{done ? "Copied" : "Copy"}</button>
    </div>
  );
}

export function Faq({ items }: { items: [string, React.ReactNode][] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="g-faq">
      {items.map(([q, a], i) => {
        const on = open === i;
        return (
          <div key={q} className={`g-q ${on ? "on" : ""}`}>
            <h3><button type="button" aria-expanded={on} aria-controls={`faq-${i}`} id={`faq-b-${i}`} onClick={() => setOpen(on ? null : i)}>
              <span>{q}</span><i aria-hidden="true" />
            </button></h3>
            <div className="g-a" id={`faq-${i}`} role="region" aria-labelledby={`faq-b-${i}`}><div><div className="g-a-in">{a}</div></div></div>
          </div>
        );
      })}
    </div>
  );
}
