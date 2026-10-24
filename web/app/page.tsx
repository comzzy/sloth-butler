import { BandedHead } from "@/components/BandedHead";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { SlothApp } from "@/components/SlothApp";

const PAINS = [
  ["“Can you just add one more page?”", "Scope creep"],
  ["“Any chance of 30% off?”", "Discounts"],
  ["“We’ll pay next month.”", "Late invoices"],
  ["“Send it now, I’ll pay later.”", "Credit"],
  ["“I’ll get back to you.”", "Gone quiet"],
  ["“Quick call in ten minutes?”", "Last-minute asks"],
];

export default function Home() {
  return (
    <>
      <a href="#app" className="skip">Skip to the app</a>
      <SiteHeader />
      <main id="top">
        <section className="hero" aria-labelledby="hero-h">
          <div className="hero-copy">
            <span className="eyebrow hero-in" style={{ ["--d" as string]: "0ms" }}><span className="eyebrow-dot" />For the messages that cost you time and money</span>
            <h1 id="hero-h" className="hero-in" style={{ ["--d" as string]: "120ms" }}>Sloth Butler handles the messages you dread replying to.</h1>
            <p className="lede hero-in" style={{ ["--d" as string]: "260ms" }}>Clients asking for free extra work. Customers pushing for a discount. Invoices that are weeks late. Save your rate and your floor once. Paste the message and get a polite, firm reply that quotes your real numbers, then let it plan the follow-ups if they go quiet.</p>
            <div className="hero-cta hero-in" style={{ ["--d" as string]: "400ms" }}>
              <a href="#negotiate" className="primary as-link">Write a reply<span aria-hidden="true">→</span></a>
              <a href="/guide" className="ghost-link">How it works</a>
            </div>
          </div>
          <BandedHead />
        </section>
        <ul className="pains" aria-label="Messages Sloth Butler helps with">
          {PAINS.map(([q, t], i) => (
            <li key={t} className="hero-in" style={{ ["--d" as string]: `${600 + i * 110}ms` }}><span>{q}</span><em>{t}</em></li>
          ))}
        </ul>
      </main>
      <div id="app"><SlothApp /></div>
      <SiteFooter />
    </>
  );
}
