import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Faq, Reveal, Sample } from "@/components/GuideBits";

export const metadata: Metadata = { title: "Guide and FAQ · Sloth Butler", description: "How to use Sloth Butler, how it works, common questions and what's planned." };

const C = ["#F5DF6E", "#AECF5A", "#5FA383", "#8E84E3", "#EE8C6E"];

const STEPS: [string, string][] = [
  ["Paste the request", "Put the message you want to turn down in \u201cThe request\u201d box, or tap one of the examples under it."],
  ["Pick tone and language", "Soft, firm or maybe-later. English or Nigerian Pidgin."],
  ["Press \u201cWrite my no\u201d", "You get one short reply: a clear no and one counter-offer. Usually under 30 words."],
  ["Play it", "Press Play to hear it in the ElevenLabs voice Alice. Press again to stop."],
  ["Copy it or try again", "\u201cCopy reply\u201d puts it on your clipboard. \u201cTry again\u201d writes a new one with the same settings."],
  ["Check time saved", "Each reply adds to the counter. Use \u2212 and + to set how many minutes one request would have cost you. Reset clears it."],
  ["Compare with the untrained model", "Runs your request through plain Qwen3-8B and through Sloth Butler, side by side."],
  ["Read the test results", "Scores from 60 requests the model never saw while training, before and after."],
];

const SAMPLES: [string, string][] = [
  ["English", "Hey, can you join a quick call at 9pm tonight to go over the slides? Won't take long."],
  ["Pidgin", "Bro abeg, help me carry my load go my new house this Saturday morning."],
  ["English", "Can you lend me 50k till month end? I'll pay back, I promise."],
  ["English", "We need one more person to run the stand at the fair on Sunday. You in?"],
  ["Pidgin", "Abeg you fit cover my shift for shop tomorrow? Na only small time."],
];

const FAQ: [string, React.ReactNode][] = [
  ["Is my text stored?", <>No. The app doesn&apos;t have a database. Your request goes to the model on Tinker to write the reply, and the reply goes to ElevenLabs only if you press Play. The server logs errors from those services, not your text. The time-saved counter lives in your browser&apos;s local storage and never leaves your device.</>],
  ["Why Pidgin?", <>Lots of people text in Nigerian Pidgin. The untrained model was bad at it: a judge model rated its Pidgin correct 4% of the time. After training it was 88%. That was the biggest gain.</>],
  ["Why only one counter-offer?", <>Two or three options start a negotiation. One offer is enough to stay friendly and keeps the no a no.</>],
  ["What does the time-saved number mean?", <>Number of replies written, times the minutes you set per request (45 by default). It&apos;s a rough guess at the time you&apos;d have spent dodging or wording the reply yourself.</>],
  ["Is it free? Is it open source?", <>Free to use. The code, training data and eval scripts are MIT licensed: <a href="https://github.com/comzzy/sloth-butler">github.com/comzzy/sloth-butler</a>.</>],
  ["Can it send the message for me?", <>No. It writes the reply. You copy it and send it yourself, after reading it.</>],
  ["What are the limits?", <ul>
    <li>Replies can be formulaic, usually &ldquo;I can&apos;t X. I can Y.&rdquo;</li>
    <li>Some counter-offers don&apos;t make sense, like offering help with something that already happened.</li>
    <li>In English, the judge model preferred the untrained replies 20 to 16. The training mostly paid off in Pidgin (22 to 2).</li>
    <li>Pidgin quality was rated by a model, not by native speakers.</li>
    <li>It can&apos;t know your real plans. Check the counter-offer is something you&apos;ll actually do.</li>
  </ul>],
];

const ROADMAP: [string, string][] = [
  ["Share to Sloth Butler", "Send a message straight from WhatsApp or email instead of copy-pasting."],
  ["Yoruba and Hausa", "Same idea, more languages. Needs new training data."],
  ["Native-speaker review", "Have Pidgin speakers rate replies, instead of only a model."],
  ["More tones", "For example \u201cwork-formal\u201d and \u201cfamily\u201d."],
  ["Browser extension", "Write the no next to the message in Gmail or web chat."],
  ["Better counter-offers", "A second training round aimed at offers that make sense for the request."],
];

function Head({ id, n, title, sub }: { id: string; n: number; title: string; sub?: string }) {
  return (
    <Reveal className="g-head" style={{ ["--c" as string]: C[n - 1] }}>
      <span className="card-step">0{n}</span>
      <h2 id={id}>{title}</h2>
      {sub && <p>{sub}</p>}
    </Reveal>
  );
}

export default function Guide() {
  return (
    <>
      <a href="#guide" className="skip">Skip to the guide</a>
      <SiteHeader home={false} />
      <main id="guide" className="stage guide">
        <div className="stage-inner g-wrap">
          <Reveal className="stage-head">
            <span className="eyebrow"><span className="eyebrow-dot" />Guide</span>
            <h1 className="g-title">How Sloth Butler works</h1>
            <p>How to use it, what&apos;s under the hood, common questions and what&apos;s next.</p>
            <ul className="g-toc">
              {[["what", "What it is"], ["use", "How to use it"], ["how", "How it works"], ["faq", "FAQ"], ["roadmap", "Roadmap"]].map(([h, t], i) => (
                <li key={h} style={{ ["--c" as string]: C[i] }}><a href={`#${h}`}>{t}</a></li>
              ))}
            </ul>
          </Reveal>

          <section className="g-sec" aria-labelledby="what">
            <Head id="what" n={1} title="What it is" />
            <Reveal className="card g-card" delay={100} style={{ ["--c" as string]: C[0] }}>
              <p className="g-lede">You paste a request you don&apos;t want to say yes to. Sloth Butler writes a short, polite no with one counter-offer, in English or Nigerian Pidgin. It runs on a small open model trained for this one job.</p>
              <Link href="/#negotiate" className="btn-secondary g-cta">Try it</Link>
            </Reveal>
          </section>

          <section className="g-sec" aria-labelledby="use">
            <Head id="use" n={2} title="How to use it" sub="The labels below match the buttons on the main page." />
            <div className="g-two">
              <ol className="g-steps">
                {STEPS.map(([t, d], i) => (
                  <Reveal as="li" key={t} delay={i * 70} className="card g-step" style={{ ["--c" as string]: C[i % 5] }}>
                    <span className="g-num">{i + 1}</span><div><h3>{t}</h3><p>{d}</p></div>
                  </Reveal>
                ))}
              </ol>
              <Reveal className="card g-samples" delay={150} style={{ ["--c" as string]: C[1] }}>
                <h3>Requests to try</h3>
                <p className="muted sm">Copy one and paste it into the request box.</p>
                {SAMPLES.map(([l, t]) => <Sample key={t} text={t} lang={l} />)}
              </Reveal>
            </div>
          </section>

          <section className="g-sec" aria-labelledby="how">
            <Head id="how" n={3} title="How it works" />
            <div className="g-two">
              <Reveal className="card g-card g-prose" delay={100} style={{ ["--c" as string]: C[2] }}>
                <p>The model is <strong>Qwen3-8B</strong>, an open-weight model anyone can download.</p>
                <p>I trained a small add-on for it (a LoRA adapter, rank 32) on <a href="https://thinkingmachines.ai/tinker/">Tinker</a> using 288 example replies. Every example had to pass a rule check first: says no in the first sentence, exactly one offer, 80 words max, no made-up excuses, right language and tone. Training took about 3 minutes.</p>
                <p><strong>Before training</strong> means plain Qwen3-8B with the same instructions. <strong>After training</strong> is the same model with the adapter on. The compare button shows both.</p>
                <p>Voice is ElevenLabs, voice Alice. It only runs when you press Play.</p>
              </Reveal>
              <Reveal className="card g-flow" delay={200} style={{ ["--c" as string]: C[3] }} aria-label="Diagram: your request and settings go to Qwen3-8B with the trained adapter on Tinker, which returns a reply; Play sends the reply to ElevenLabs for audio.">
                {[["Your request", "plus tone and language", C[0]], ["Qwen3-8B + adapter", "runs on Tinker", C[2]], ["Reply", "one no, one offer", C[3]], ["ElevenLabs (Alice)", "only if you press Play", C[4]]].map(([t, s, c], i) => (
                  <div key={t} className="g-node" style={{ ["--c" as string]: c, ["--i" as string]: i }}>
                    <strong>{t}</strong><span>{s}</span>
                  </div>
                ))}
              </Reveal>
            </div>
          </section>

          <section className="g-sec" aria-labelledby="faq">
            <Head id="faq" n={4} title="FAQ" />
            <Reveal className="card" delay={100} style={{ ["--c" as string]: C[3] }}><Faq items={FAQ} /></Reveal>
          </section>

          <section className="g-sec" aria-labelledby="roadmap">
            <Head id="roadmap" n={5} title="Roadmap" sub="Planned, not built yet. No dates." />
            <div className="g-road">
              {ROADMAP.map(([t, d], i) => (
                <Reveal key={t} delay={i * 80} className="card g-item" style={{ ["--c" as string]: C[i % 5] }}>
                  <span className="g-badge">Planned</span><h3>{t}</h3><p>{d}</p>
                </Reveal>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
