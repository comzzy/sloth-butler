import { BandedHead } from "@/components/BandedHead";
import { Logo } from "@/components/Logo";
import { SlothApp } from "@/components/SlothApp";

export default function Home() {
  return (
    <>
      <a href="#app" className="skip">Skip to the app</a>
      <header className="site-header">
        <a href="#top" className="brand" aria-label="Sloth Butler home"><Logo size={38} /><span>Sloth Butler</span></a>
        <nav aria-label="Main">
          <a href="#negotiate">Try it</a>
          <a href="#ledger">Time saved</a>
          <a href="#proof">Does it work?</a>
        </nav>
      </header>
      <main id="top">
        <section className="hero" aria-labelledby="hero-h">
          <div className="hero-copy">
            <h1 id="hero-h">Say not now,<br />kindly.</h1>
            <p className="lede">Paste a message you don't want to say yes to. You get a short, polite no with one counter-offer. It can read it out loud too.</p>
            <a href="#negotiate" className="primary as-link">Try it</a>
            <p className="small-print">Open source. Runs on Qwen3-8B, trained for this one job.</p>
          </div>
          <BandedHead />
        </section>
      </main>
      <div id="app"><SlothApp /></div>
      <footer className="site-footer">
        <Logo size={28} /><span>Sloth Butler. MIT licence. Read the reply before you send it.</span>
      </footer>
    </>
  );
}
