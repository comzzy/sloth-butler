import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Faq, Reveal, Sample } from "@/components/GuideBits";

export const metadata: Metadata = { title: "Guide and FAQ · Sloth-Butler", description: "How to use Sloth-Butler for scope creep, discounts, late invoices and last-minute asks: steps, FAQ and roadmap." };

const C = ["#F5DF6E", "#AECF5A", "#5FA383", "#8E84E3", "#EE8C6E"];

const STEPS: [string, string][] = [
  ["Save your terms once", "In \u201cYour terms\u201d, add your name or business, currency, hourly or day rate, minimum project price, the biggest discount you\u2019ll give, payment terms, late fee and when you\u2019re next free. Press \u201cSave my terms\u201d. They stay in your browser."],
  ["Pick the situation", "Free extra work, a discount request, a late or unpaid invoice, \u201cI\u2019ll get back to you\u201d, a pay-later request, a last-minute favour, or Something else. This tells the model what kind of counter-offer makes sense."],
  ["Paste their message", "Copy the email, DM or text you received into \u201cTheir message\u201d. \u201cUse an example\u201d fills in a sample if you just want to see how it works."],
  ["Add the amount or deadline", "Both optional. The amount is used in follow-ups and in your log; the deadline lets the reply name a real date."],
  ["Choose a tone and language", "Soft is warm, firm is short and direct, maybe-later names a time to revisit. Languages: English, Spanish, French, Portuguese, German and Nigerian Pidgin."],
  ["Press \u201cWrite my reply\u201d", "You get one reply with a single counter-offer that uses your real figures. \u201cUsing your terms\u201d shows it read them. If a draft quotes less than your minimum or more discount than you allow, it is rewritten or a line with your real terms is added."],
  ["Plan follow-ups", "For a late invoice or \u201cI\u2019ll get back to you\u201d, press \u201cPlan follow-ups\u201d. You get a friendly nudge, a firmer reminder and a final notice with your late fee, due in 3, 7 and 14 days unless you change the numbers. They land on the Follow-ups board under Due today, Upcoming and Done. The number next to Follow-ups in the menu is what\u2019s due today."],
  ["Copy, play or download", "\u201cCopy reply\u201d puts it on your clipboard. \u201cPlay voice\u201d reads it in the ElevenLabs voice Alice. \u201cDownload mp3\u201d saves it as a voice note you can send on WhatsApp, Telegram or anywhere else."],
  ["Mark sent, mark paid", "Copy a follow-up or play it as a voice note, send it yourself, then press \u201cMark sent\u201d. When the invoice is paid, \u201cMark paid\u201d closes the plan and adds the amount to your log as money recovered."],
  ["Log what it protected", "If you send a reply, enter the hours and money it saved you and press \u201cSave to log\u201d. Totals count up on the page."],
  ["Check the proof", "Lower on the page, compare the same message on plain Qwen3-8B and on Sloth-Butler, and read the test scores."],
];

const SAMPLES: [string, string][] = [
  ["Free extra work", "Since you're already doing the logo, could you also put together a few social media banners? Should be quick for you."],
  ["Discount", "Love your work but $1,200 is more than we planned. Could you do it for $700?"],
  ["Late invoice", "Hi, sorry for the delay on invoice #104. Things are slow this month, can we settle it in six weeks?"],
  ["Pay later", "Can you ship the two lamps today? I'll transfer the money once my client pays me."],
  ["Last-minute", "Any chance you could jump on a call in 20 minutes? Just want to run some ideas past you."],
];

const FAQ: [string, React.ReactNode][] = [
  ["Why not just use ChatGPT?", <ul>
    <li>It remembers your terms. Your rate, minimum, discount limit and payment terms go into every reply, and the server checks the reply doesn&apos;t go under your floor.</li>
    <li>It follows up for you. A late invoice gets a three-step plan with dates, and the board tells you what to send today.</li>
    <li>It&apos;s a small open model trained for this one job. Qwen3-8B with a small adapter, MIT licensed. You can run it yourself.</li>
    <li>Your messages stay private. No account, no database, and message text isn&apos;t logged. Terms, follow-ups and your log live in your browser.</li>
    <li>Voice notes. Any reply or follow-up can be played or saved as an mp3 to send on WhatsApp or Telegram.</li>
  </ul>],
  ["What if the reply goes below my minimum?", <>The server reads every reply for prices and discounts. If it quotes less than your minimum project price or more off than you allow, it writes the reply again with that pointed out. If the second try still breaks it, it adds a line with your real terms, such as &ldquo;To be clear, my minimum for a project is $900.&rdquo; Hourly rates, deposits and part payments aren&apos;t counted as the project price.</>],
  ["Who is this for?", <>For the messages that cost you time and money: requests for free extra work, pressure to drop your price, invoices that are late, and people who go quiet on a decision. If you bill for your time or your products, it helps.</>],
  ["Is my text stored?", <>No. There is no database. Your message and context go to the model on Tinker to write the reply, and the reply goes to ElevenLabs only if you press Play or Download. The server logs service errors, not your text. Your terms, follow-ups and log of protected hours and money live in your browser&apos;s local storage.</>],
  ["Why only one counter-offer?", <>Two or three options turn the reply into a negotiation. One clear option, like a paid add-on or a fixed payment date, keeps the conversation short and keeps your terms in place.</>],
  ["How is &ldquo;money protected&rdquo; counted?", <>You enter it. For a discount request it might be the discount you didn&apos;t give; for scope creep, the value of the work you didn&apos;t do for free; for a late invoice, the amount you asked for. Hours work the same way. The app adds up what you log, in the currency you choose.</>],
  ["Which currencies and languages?", <>The log supports USD (default), EUR, GBP, CAD, AUD, INR, JPY, BRL, ZAR, MXN, CHF and SGD. Replies can be written in English, Spanish, French, Portuguese, German or Nigerian Pidgin. English and Pidgin were part of training; the other languages rely on the base model&apos;s own skill.</>],
  ["Can it send the message for me?", <>No. It writes the reply. You read it, copy it or download the voice note, and send it yourself.</>],
  ["Is it free? Is it open source?", <>Free to use. The code, training data and eval scripts are MIT licensed: <a href="https://github.com/comzzy/sloth-butler">github.com/comzzy/sloth-butler</a>.</>],
  ["What are the limits?", <ul>
    <li>Replies can be formulaic, often &ldquo;I can&apos;t do X. I can do Y.&rdquo;</li>
    <li>It doesn&apos;t know your contract or your real calendar. Check the counter-offer is something you&apos;ll actually honour.</li>
    <li>The adapter was trained on general requests; the situation picker steers it with extra instructions rather than new training.</li>
    <li>In the tests, the training paid off most on rule-following and Pidgin; for plain English the judge was close to a tie.</li>
  </ul>],
];

const ROADMAP: [string, string][] = [
  ["Training on business messages", "A second training round on real-style client, customer and invoice messages, so the situation picker isn't only steering the prompt."],
  ["Share to Sloth-Butler", "Send a message straight from email or a chat app instead of copy-pasting."],
  ["Reminders on your phone", "A notification when a follow-up is due, instead of checking the board."],
  ["Export your log", "Download your protected hours and money as CSV for your own records."],
  ["Shared terms for a team", "One set of rates and floors that everyone on a small team replies from."],
  ["More languages", "Italian, Dutch, Hindi and others, with native-speaker review."],
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
            <h1 className="g-title">How Sloth-Butler works</h1>
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
              <p className="g-lede">Sloth-Butler handles the messages you dread replying to: a client asking for free extra work, a customer pushing for a discount, an invoice that is weeks late, someone who wants to pay later, or a last-minute call. You paste the message, and it writes a polite, firm reply with one counter-offer, such as a paid option, a later date or a partial yes. You can copy it, listen to it or save it as a voice note, then log the hours and money it protected. It remembers your rate and your floor, and plans follow-ups for invoices that are late.</p>
              <Link href="/#negotiate" className="btn-secondary g-cta">Write a reply</Link>
            </Reveal>
          </section>

          <section className="g-sec" aria-labelledby="use">
            <Head id="use" n={2} title="How to use it" sub="The labels below match the buttons on the main page. It takes about a minute." />
            <div className="g-two">
              <ol className="g-steps">
                {STEPS.map(([t, d], i) => (
                  <Reveal as="li" key={t} delay={i * 70} className="card g-step" style={{ ["--c" as string]: C[i % 5] }}>
                    <span className="g-num">{i + 1}</span><div><h3>{t}</h3><p>{d}</p></div>
                  </Reveal>
                ))}
              </ol>
              <Reveal className="card g-samples" delay={150} style={{ ["--c" as string]: C[1] }}>
                <h3>Messages to try</h3>
                <p className="muted sm">Copy one and paste it into &ldquo;Their message&rdquo;.</p>
                {SAMPLES.map(([l, t]) => <Sample key={t} text={t} lang={l} />)}
              </Reveal>
            </div>
          </section>

          <section className="g-sec" aria-labelledby="how">
            <Head id="how" n={3} title="How it works" />
            <div className="g-two">
              <Reveal className="card g-card g-prose" delay={100} style={{ ["--c" as string]: C[2] }}>
                <p>The model is <strong>Qwen3-8B</strong>, an open-weight model anyone can download.</p>
                <p>I trained a small add-on for it (a LoRA adapter, rank 32) on <a href="https://thinkingmachines.ai/tinker/">Tinker</a> using 288 example replies. Every example had to pass a rule check first: clear answer in the first sentence, exactly one offer, 80 words max, no made-up excuses, right language and tone. Training took about 3 minutes. The situation you pick and your saved terms are added to the instructions, so the counter-offer fits the message.</p>
                <p><strong>Before training</strong> means plain Qwen3-8B with the same instructions. <strong>After training</strong> is the same model with the adapter on. The compare button on the main page shows both.</p>
                <p>Voice is ElevenLabs, voice Alice. It only runs when you press Play or Download mp3.</p>
              </Reveal>
              <Reveal className="card g-flow" delay={200} style={{ ["--c" as string]: C[3] }} aria-label="Diagram: their message, the situation and your settings go to Qwen3-8B with the trained adapter on Tinker, which returns a reply; Play sends the reply to ElevenLabs for audio.">
                {[["Their message", "plus situation, your terms, tone", C[0]], ["Qwen3-8B + adapter", "runs on Tinker", C[2]], ["Reply", "firm answer, one offer", C[3]], ["ElevenLabs (Alice)", "play or download mp3", C[4]]].map(([t, s, c], i) => (
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
