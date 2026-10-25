# Sloth-Butler

Sloth-Butler handles the messages you dread replying to.

Live: **https://sloth-butler.vercel.app** · Demo video: https://sloth-butler.vercel.app/demo.mp4 · Guide and FAQ: https://sloth-butler.vercel.app/guide

<sub>Demo music: "Late Night Radio" by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).</sub>

If you sell your time or your products, you know these messages. A client asks you to "just add one more page" for free. A customer wants 30% off. An invoice is three weeks late and the client asks for another month. Someone wants the order today and to pay you "at the end of the month". A call request lands with ten minutes' notice.

None of these are hard decisions. The hard part is the wording: staying polite without giving ground, not over-apologising, and not opening a long back-and-forth. So the reply sits in your inbox for days. Sloth-Butler writes it for you in a few seconds: a polite, firm answer with exactly one counter-offer, such as a paid option, a later date or a partial yes.

It is for the messages that cost you time and money: unpaid extra work, discount pressure, late invoices and clients who go quiet, in whatever currency you bill.

## What it does

- **Situation picker.** Choose what kind of message it is: free extra work (scope creep), a discount request, a late or unpaid invoice, "I'll get back to you", a pay-later or credit request, a last-minute favour or meeting, or something else. Each situation tells the model what a sensible counter-offer looks like.
- **Your terms.** Save your name or business, currency, hourly or day rate, minimum project price, the biggest discount you'll give, deposit or payment terms, late fee and when you're next available. They are sent with every reply, so the counter-offer quotes your real figures. The server checks each reply: if it quotes a price under your minimum or a discount over your limit, it rewrites it once, and if that still fails it adds a line with your real terms. The reply shows a "Using your terms" chip.
- **Follow-ups.** For late or unpaid invoices and "I'll get back to you" replies, press **Plan follow-ups** to get a friendly nudge, a firmer reminder and a final notice with your late fee, due at +3, +7 and +14 days (editable). They go on a Follow-ups board (Due today, Upcoming, Done) with copy, voice note and mark-sent buttons, and the menu shows how many are due today. Marking an invoice paid adds it to your log as money recovered.
- **Tone and language.** `soft`, `firm` or `maybe-later`. Replies can be written in English, Spanish, French, Portuguese, German or Nigerian Pidgin.
- **Ready to send.** Copy the reply, play it in the ElevenLabs voice Alice, or download it as an mp3 voice note for chat apps.
- **A log of what you protected.** When you send a reply, log the hours and the money it protected. Pick your currency (USD by default; EUR, GBP, CAD, AUD, INR, JPY and more). Totals count up on the page. The log is stored in your browser's local storage only.
- **Proof it's trained.** Lower on the page you can run the same message through plain Qwen3-8B and through Sloth-Butler side by side, and read the test results from 100 held-out messages.

## How to use it

1. Open https://sloth-butler.vercel.app and press **Write a reply**.
2. Fill in **Your terms** once and press **Save my terms**.
3. Pick the situation and paste the message you received into **Their message**.
4. Add the amount involved or a deadline if it matters.
5. Pick a tone and a language, then press **Write my reply**.
6. Read it. Copy it, play it, or download the mp3. Press **Write another** for a different version.
7. For a late invoice or a client who went quiet, press **Plan follow-ups**, then work through the Follow-ups board and press **Mark sent** or **Mark paid**.
8. If you send a reply, enter the hours and money it protected and press **Save to log**.

Always read the reply before sending. The model doesn't know your contract or your calendar, so make sure the counter-offer is one you'll honour.

## Example

Situation: free extra work. Tone: firm. Terms: $60/hour, $900 minimum.

> Since you're already doing the logo, could you also put together a few social media banners? Should be quick for you.

A typical reply:

> I can't add the banners to the logo project. I can quote them separately at $60 an hour if you'd like them this month.

## How it works

1. The browser sends the message, the situation, your saved terms, an optional amount and deadline, and the tone and language to `POST /api/decline`. Follow-up plans go to `POST /api/followups`, which writes the three steps in parallel.
2. The server builds the same prompt format the model was trained on (system prompt from `scripts/common.py`, `Style` and `Language` lines), adds a short description of the situation, your context and a line with your terms and limits, and renders it with the `qwen3_disable_thinking` template.
3. It samples from the fine-tuned Qwen3-8B LoRA adapter on Tinker through the OpenAI-compatible `/completions` endpoint. The checkpoint path comes from the `MODEL_FINETUNE_PATH` environment variable.
4. If you press Play or Download, `POST /api/voice` turns the reply into speech with ElevenLabs (voice Alice) and caches the mp3.

There is no database and no account. Message text is not logged. Your terms, follow-ups and log are kept in your browser's local storage.

### API

```bash
curl -s https://sloth-butler.vercel.app/api/decline \
  -H 'content-type: application/json' \
  -d '{"request":"Can you do 30% off? Budget is tight.","style":"firm","language":"English",
       "scenario":"discount","terms":{"currency":"USD","rate":60,"rateUnit":"hour","minProject":900,"maxDiscount":10,"payment":"50% upfront"}}'

curl -s https://sloth-butler.vercel.app/api/followups \
  -H 'content-type: application/json' \
  -d '{"request":"Sorry, can we push invoice #104 to next month?","scenario":"late-invoice","amount":1200,
       "days":[3,7,14],"terms":{"currency":"USD","lateFee":"2% per month after 14 days","payment":"net 14"}}'
```

| Field | Values |
|---|---|
| `request` | the message you received, 5 to 2,000 characters |
| `style` | `soft`, `firm`, `maybe-later` |
| `language` | `English`, `Spanish`, `French`, `Portuguese`, `German`, `Nigerian Pidgin` |
| `scenario` (optional) | `scope-creep`, `discount`, `late-invoice`, `credit`, `favour`, `other` |
| `context` (optional) | `{ "rate": string, "deadline": string, "notes": string }` |
| `compare` (optional) | `true` returns `{ base, finetune }` side by side |

`POST /api/voice` with `{"text": "..."}` returns `audio/mpeg`. `GET /api/eval` returns the evaluation summary.

### Running it yourself

```bash
cd web
cp .env.example .env.local   # TINKER_API_KEY, MODEL_FINETUNE_PATH, ELEVENLABS_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

The web app is deployed on Vercel from the `master` branch. See `web/README.md` for the environment variables.

## The model

Qwen3-8B with a LoRA adapter (rank 32) trained on Tinker for one job: a polite, firm reply to a client, customer or invoice message, with one concrete counter-offer that respects your terms.

| Setting | Value |
|---|---|
| Base model | `Qwen/Qwen3-8B` (thinking disabled) |
| Method | LoRA, rank 32, supervised fine-tuning |
| Training examples | 1,101 |
| Languages | 6: English 527, French 137, Portuguese 125, German 111, Spanish 101, Nigerian Pidgin 100 |
| Steps | 204 (3 epochs, batch 16, learning rate 2e-4 decaying to 0) |
| Train loss | 2.90 at step 0, 0.44 at the last step |
| Checkpoint | `tinker://ea588015-cff4-5702-99e8-ce0bf3d5af5b:train:0/sampler_weights/sloth-butler-replies` |

The full per-step log is in `eval/training.json`.

## Evaluation

Base Qwen3-8B and the trained adapter answered the same 100 held-out messages (never used in training) with the same prompt, temperature 0.7 and seed 2026. A judge model (`openai/gpt-oss-120b`) scored each reply from 1 to 5 on five criteria. A reply **passes** a criterion when it scores at least 4/5.

| Criterion | Before training | After training |
|---|---|---|
| Sendable | 84% | 93% |
| Firm but polite | 84% | 97% |
| Has a counter-offer | 74% | 90% |
| Fits the situation | 67% | 76% |
| Correct language | 90% | 94% |
| **Passes all five** | **41%** | **63%** |
| Pidgin sounds natural (10 replies) | 10% | 50% |
| Average words per reply | 51.1 | 34.4 |

In a blind side-by-side, the judge preferred the trained reply 56 times out of 100.

Raw outputs and judge reasons are in `eval/outputs.jsonl`; the summary is in `eval/results.json` and `eval/results.md`.

### How far to trust these numbers

- The judge is a single LLM, and the same model family wrote the training replies, so it may favour the trained model's style. No human rating has been done yet.
- 100 test messages is small. A difference of a few points on one criterion is within noise; the "passes all five" jump (41% to 63%) and the counter-offer gain are the clearest signals.
- Pidgin is judged by the same LLM on only 10 replies, not by native speakers. Treat 50% as "better, still not good".
- Test messages were generated the same way as training messages, so real messages may be harder.
- The app also checks every reply against your terms in code (minimum price, including after a discount, and maximum discount) and regenerates it if a number breaks them, so the model's numbers are never the only safeguard.

## Reproduce

Requirements: Python 3.11+, a Tinker API key and a Groq API key.

```bash
python -m venv .venv && source .venv/bin/activate
pip install tinker tinker-cookbook openai
export TINKER_API_KEY=...   # never commit this
export GROQ_API_KEY=...

python scripts/gen_requests.py   # data/requests.jsonl (LLM sampling, so a rerun gives different requests)
python scripts/gen_replies.py    # data/test.jsonl, data/train.jsonl, data/rejected.jsonl
python scripts/train.py          # eval/training.json with the checkpoint path
python scripts/eval.py           # eval/results.json, eval/outputs.jsonl
python scripts/report.py         # eval/results.md
```

To check my numbers without regenerating data, skip the first two steps and use the committed `data/` files. Generation by LLMs is not bit-for-bit reproducible even with seeds, so expect small differences in a rerun.

## Project structure

```
data/
  requests.jsonl    all 370 generated requests with style/language assignment
  train.jsonl       1,101 training examples
  rejected.jsonl    22 requests whose teacher replies never passed the checker
  test.jsonl        100 held-out test messages
scripts/
  common.py         system prompt, prompt format, Groq client
  checks.py         deterministic reply checker
  tinker_chat.py    chat sampling on Tinker (base or LoRA checkpoint)
  gen_requests.py   request generation
  gen_replies.py    train/test split, teacher replies, filtering
  train.py          LoRA SFT on Tinker
  eval.py           base vs fine-tune evaluation
  report.py         writes eval/results.md
eval/
  training.json     training config, per-step loss, checkpoint path
  results.json      summary metrics
  results.md        tables, examples, known failures
  outputs.jsonl     every test reply with checker and judge output
web/                Next.js web app, deployed to Vercel
```

## Web app

The app in `web/` is a Next.js (App Router, TypeScript) site with three server routes (`/api/decline`, `/api/voice`, `/api/eval`). The evaluation numbers above were measured with the training prompt only and do not depend on the web app.

## Credits

- [Qwen3-8B](https://huggingface.co/Qwen/Qwen3-8B) by the Qwen team, Apache 2.0. The base model.
- [Tinker](https://thinkingmachines.ai/tinker/) by Thinking Machines Lab for LoRA training and sampling, and [tinker-cookbook](https://github.com/thinking-machines-lab/tinker-cookbook) for renderers, `conversation_to_datum`, and the training loop pattern in `scripts/train.py`.
- [gpt-oss-120b](https://huggingface.co/openai/gpt-oss-120b), open-weight, used as teacher and judge, served by [Groq](https://groq.com) and Tinker.
- [ElevenLabs](https://elevenlabs.io) for the voice (Alice).

## Licence

MIT. See `LICENSE`. Generated data in `data/` is released under the same licence.
