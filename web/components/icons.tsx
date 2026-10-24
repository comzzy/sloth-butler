// Custom line icons for the five Sloth Butler features. 48x48 grid, 2px white strokes.
import type { SVGProps } from "react";
type P = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

/** 1 Negotiate: speech bubble holding a polite raised palm. */
export function IconNegotiate(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M8 10h32a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H22l-8 7v-7H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z" />
      <path d="M20 29v-9.5a1.6 1.6 0 0 1 3.2 0V24" />
      <path d="M23.2 23v-6.2a1.6 1.6 0 0 1 3.2 0V23" />
      <path d="M26.4 23v-5.2a1.6 1.6 0 0 1 3.2 0V24" />
      <path d="M29.6 24v-3a1.5 1.5 0 0 1 3 0v3.5c0 3-2 5.5-5.5 5.5H24c-2 0-3-1-4-2l-2.6-3.2a1.4 1.4 0 0 1 2.2-1.8L20 25" />
    </svg>
  );
}

/** 2 Pick your style: bow tie over a three-stop slider. */
export function IconStyle(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M24 15l-9-5v10z M24 15l9-5v10z" />
      <circle cx="24" cy="15" r="2" />
      <path d="M8 31h32" />
      <circle cx="12" cy="31" r="1.2" />
      <circle cx="24" cy="31" r="1.2" />
      <circle cx="36" cy="31" r="1.2" />
      <circle cx="30" cy="31" r="4" />
      <path d="M8 39h10 M22 39h18" strokeOpacity="0.7" />
    </svg>
  );
}

/** 3 Butler voice: bow tie emitting calm sound waves. */
export function IconVoice(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M20 24l-12-7v14z M20 24l-4 0" />
      <path d="M20 24l10-6v12z" />
      <circle cx="20" cy="24" r="2.4" />
      <path d="M35 19a7 7 0 0 1 0 10" />
      <path d="M39 15a13 13 0 0 1 0 18" />
    </svg>
  );
}

/** 4 Snooze Ledger: hourglass beside tally marks. */
export function IconLedger(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M8 8h16 M8 40h16" />
      <path d="M10 8c0 8 10 10 10 16s-10 8-10 16" />
      <path d="M22 8c0 8-10 10-10 16" />
      <path d="M12 40c0-4 4-6 4-8s4 4 4 8" />
      <path d="M29 14v20 M33 14v20 M37 14v20 M41 14v20 M27 30l16-12" />
    </svg>
  );
}

/** 5 Proof panel: balance scale weighing two replies. */
export function IconProof(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M24 8v32 M16 40h16 M10 14h28" />
      <circle cx="24" cy="8" r="1.6" />
      <path d="M10 14l-5 12h10z M38 14l-5 12h10z" />
      <path d="M5 26a5 4 0 0 0 10 0 M33 26a5 4 0 0 0 10 0" />
      <path d="M35.5 21.5l1.8 1.8 3.2-3.6" />
    </svg>
  );
}

/** Your terms: a price tag with a floor line. */
export function IconTerms(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M24 6h14a4 4 0 0 1 4 4v14L24 42 6 24 24 6z" />
      <circle cx="34" cy="14" r="2.5" />
      <path d="M18 26l8-8M17 32h12" />
    </svg>
  );
}

/** Follow-ups: a calendar page with three steps. */
export function IconFollow(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="7" y="10" width="34" height="30" rx="4" />
      <path d="M7 18h34M16 6v8M32 6v8" />
      <circle cx="15" cy="29" r="2.5" /><circle cx="24" cy="29" r="2.5" /><path d="M31 29l2.5 2.5L38 26" />
    </svg>
  );
}
