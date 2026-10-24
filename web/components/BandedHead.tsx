import { FEATURES } from "@/lib/features";
import { IconLedger, IconNegotiate, IconProof, IconStyle, IconVoice } from "./icons";

const ICONS = [IconNegotiate, IconStyle, IconVoice, IconLedger, IconProof];

// Left-facing profile, 320 x 500. Flat right edge so each band runs on into its rule.
const HEAD =
  "M320 0 H214 C128 2 64 48 50 128 C45 156 48 176 44 196 C38 214 22 236 12 254 C8 262 12 270 22 272 L36 274 " +
  "C34 284 34 292 40 298 C34 304 34 312 40 318 C36 326 36 336 42 344 C48 358 62 364 84 366 C102 368 110 380 112 404 " +
  "L118 500 H320 Z";

export function BandedHead() {
  return (
    <div className="head">
      <svg className="head-svg" viewBox="10.5 0 309.5 500" preserveAspectRatio="xMinYMin meet" role="group" aria-label="Sloth-Butler features">
        <defs>
          <clipPath id="headClip"><path d={HEAD} /></clipPath>
        </defs>
        <g clipPath="url(#headClip)">
          {FEATURES.map((f, i) => (
            <rect key={f.id} className="band" style={{ animationDelay: `${0.2 + i * 0.32}s` }} x="0" y={i * 100} width="320" height="101" fill={f.color} />
          ))}
        </g>
        {FEATURES.map((f, i) => {
          const I = ICONS[i];
          return (
            <a key={f.id} href={`#${f.id}`} className="badge-link" aria-label={`${f.n}. ${f.title}`}>
              <g className="badge" style={{ animationDelay: `${1 + i * 0.32}s, ${2.6 + i * 0.9}s` }}>
                <circle cx="258" cy={50 + i * 100} r="44" fill={f.dark} />
                <I className="badge-icon" x="232" y={24 + i * 100} width="52" height="52" color="#fff" />
              </g>
            </a>
          );
        })}
      </svg>
      <ol className="head-rows">
        {FEATURES.map((f, i) => (
          <li key={f.id} className="head-row" style={{ borderColor: f.color, animationDelay: `${0.5 + i * 0.32}s` }}>
            <a href={`#${f.id}`} tabIndex={-1}>
              <span className="num" style={{ color: f.color }} aria-hidden="true">{f.n}</span>
              <span>
                <strong><span className="t-long">{f.title}</span><span className="t-short">{f.short}</span></strong>
                <span className="row-line">{f.line}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
