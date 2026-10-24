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
          <a href="#ledger">Ledger</a>
          <a href="#proof">Proof</a>
        </nav>
      </header>
      <main id="top">
        <section className="hero" aria-labelledby="hero-h">
          <div className="hero-copy">
            <h1 id="hero-h">Say not now,<br />kindly.</h1>
            <p className="lede">Paste a request you dread. Sloth Butler writes a clear, polite no with one counter-offer, in the tone and language you pick, and reads it aloud in a calm voice.</p>
            <a href="#negotiate" className="primary as-link">Decline something</a>
            <p className="small-print">Open source. Runs on a fine-tuned open-weight model.</p>
          </div>
          <BandedHead />
        </section>
        <div id="app"><SlothApp /></div>
      </main>
      <footer className="site-footer">
        <Logo size={28} /><span>Sloth Butler. Open source under the MIT licence. Replies are suggestions; read before you send.</span>
      </footer>
    </>
  );
}
