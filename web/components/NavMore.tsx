"use client";
import { useEffect, useRef, useState } from "react";

export function NavMore({ p }: { p: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="nav-more" ref={ref}>
      <button type="button" aria-expanded={open} aria-controls="nav-more-menu" aria-label="More pages" onClick={() => setOpen(o => !o)}>
        <span aria-hidden="true" className="dots"><i /><i /><i /></span>
      </button>
      <div id="nav-more-menu" className={`nav-menu${open ? " open" : ""}`} role="menu">
        <a role="menuitem" href={`${p}#terms`} onClick={() => setOpen(false)}>Your terms</a>
        <a role="menuitem" href={`${p}#ledger`} onClick={() => setOpen(false)}>Your log</a>
      </div>
    </div>
  );
}
