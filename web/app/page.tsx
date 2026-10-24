import { BandedHead } from "@/components/BandedHead";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { SlothApp } from "@/components/SlothApp";

export default function Home() {
  return (
    <>
      <a href="#app" className="skip">Skip to the app</a>
      <SiteHeader />
      <main id="top">
        <section className="hero" aria-labelledby="hero-h">
          <div className="hero-copy">
            <h1 id="hero-h">Say not now,<br />kindly.</h1>
            <p className="lede">Paste a message you don't want to say yes to. You get a short, polite no with one counter-offer. It can read it out loud too.</p>
            <a href="#negotiate" className="primary as-link">Try it</a>
            <p className="small-print">Open source. Runs on Qwen3-8B, trained for this one job. <a href="/guide">How it works</a></p>
          </div>
          <BandedHead />
        </section>
      </main>
      <div id="app"><SlothApp /></div>
      <SiteFooter />
    </>
  );
}
