# Sloth Butler

**Sloth Butler handles the messages you dread replying to.**

Live: **https://sloth-butler.vercel.app** · Guide and FAQ: https://sloth-butler.vercel.app/guide

If you sell your time or your products, you know these messages. A client asks you to "just add one more page" for free. A customer wants 30% off. An invoice is three weeks late and the client asks for another month. Someone wants the order today and to pay you "at the end of the month". A call request lands with ten minutes' notice.

None of these are hard decisions. The hard part is the wording: staying polite without giving ground, not over-apologising, and not opening a long back-and-forth. So the reply sits in your inbox for days. Sloth Butler writes it for you in a few seconds: a polite, firm answer with exactly one counter-offer, such as a paid option, a later date or a partial yes.

It is built for freelancers, consultants, small business owners and online sellers, wherever they work and in whatever currency they bill.

## What it does

- **Situation picker.** Choose what kind of message it is: free extra work (scope creep), a discount request, a late or unpaid invoice, a pay-later or credit request, a last-minute favour or meeting, or something else. Each situation tells the model what a sensible counter-offer looks like.
- **Your context.** Optionally add your rate or price and any deadline. The reply can use them, for example quoting a paid add-on at your hourly rate or naming the date you expect payment.
- **Tone and language.** `soft`, `firm` or `maybe-later`. Replies can be written in English, Spanish, French, Portuguese, German or Nigerian Pidgin.
- **Ready to send.** Copy the reply, play it in the ElevenLabs voice Alice, or download it as an mp3 voice note for chat apps.
- **A log of what you protected.** When you send a reply, log the hours and the money it protected. Pick your currency (USD by default; EUR, GBP, CAD, AUD, INR, JPY and more). Totals count up on the page. The log is stored in your browser's local storage only.
- **Proof it's trained.** Lower on the page you can run the same message through plain Qwen3-8B and through Sloth Butler side by side, and read the test results from 60 held-out requests.

## How to use it

1. Open https://sloth-butler.vercel.app and press **Write a reply**.
2. Pick the situation.
3. Paste the message you received into **Their message**.
4. Add your rate or a deadline if it matters.
5. Pick a tone and a language, then press **Write my reply**.
6. Read it. Copy it, play it, or download the mp3. Press **Write another** for a different version.
7. If you send it, enter the hours and money it protected and press **Save to log**.

Always read the reply before sending. The model doesn't know your contract or your calendar, so make sure the counter-offer is one you'll honour.

## Example

Situation: free extra work. Tone: firm. Rate: $60/hour.

> Since you're already doing the logo, could you also put together a few social media banners? Should be quick for you.

A typical reply:

> I can't add the banners to the logo project. I can quote them separately at $60 an hour if you'd like them this month.

## How it works

1. The browser sends the message, the situation, your optional rate and deadline, and the tone and language to `POST /api/decline`.
2. The server builds the same prompt format the model was trained on (system prompt from `scripts/common.py`, `Style` and `Language` lines), adds a short description of the situation and your context, and renders it with the `qwen3_disable_thinking` template.
3. It samples from the fine-tuned Qwen3-8B LoRA adapter on Tinker through the OpenAI-compatible `/completions` endpoint. The checkpoint path comes from the `MODEL_FINETUNE_PATH` environment variable.
4. If you press Play or Download, `POST /api/voice` turns the reply into speech with ElevenLabs (voice Alice) and caches the mp3.

There is no database and no account. Message text is not logged.

### API

```bash
curl -s https://sloth-butler.vercel.app/api/decline \
  -H 'content-type: application/json' \
  -d '{"request":"Can you do 30% off? Budget is tight.","style":"firm","language":"English",
       "scenario":"discount","context":{"rate":"$900 flat","deadline":"start next Monday"}}'
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

The model is Qwen3-8B with a small LoRA adapter trained on Tinker for one narrow job: turning down a request clearly, with one concrete alternative. General chat models can do this, but in testing the base model often hedged ("maybe I can..."), offered two or three alternatives, or made up reasons. A small trained model does the job more consistently and cheaply.

The rest of this README covers how the adapter was trained and tested.

Reply rules the model is trained to follow:

- Give the answer clearly in the first sentence.
- Exactly one concrete counter-offer.
- 80 words or fewer.
- At most one apology.
- No invented excuses (illness, emergencies, travel, fake conflicts).
- No filler phrases ("I hope this finds you well", "rest assured", "I understand", em dashes, and so on).
- Match the requested language and style.

## Why open weights

- It can be fine-tuned. The adapter is about 3 minutes of training and moves rule-following from 27% to 85% on held-out data.
- Languages the base model handles badly can be fixed directly. Pidgin went from 4% judged correct to 88%.
- Cheap. An 8B model with short outputs costs well under a hundredth of a cent per reply.
- Swappable. The training script takes a base model name, and the adapter weights can be downloaded and run elsewhere.

## Dataset

All generation scripts are in `scripts/` and all data is in `data/`.

- `scripts/gen_requests.py` asks `openai/gpt-oss-120b` (via Groq) for realistic dreaded messages across 12 categories (meeting invites, favours, boss asks, group chats, family, client scope creep, shift cover, landlord or neighbour, church or community volunteering, party invites, money requests, "pick your brain" asks) and 14 settings (startups, offices, shops, family and community group chats). After de-duplication: **370 requests**. Each was randomly assigned a style and a language (target 25% Pidgin; actual 115/370 = 31%).
- `scripts/gen_replies.py` shuffles with seed 1234 and holds out **60 requests as the test set** (`data/test.jsonl`). These are never shown to the teacher or the trainer.
- For the remaining 310, the teacher (`openai/gpt-oss-120b`, sampled on Tinker because Groq's free tier allows 8k tokens per minute) writes a reply. Each reply is run through `scripts/checks.py`; if it fails, the teacher gets up to 3 attempts. **288 passed and form `data/train.jsonl`**; the 22 that never passed are in `data/rejected.jsonl` with the rules they failed.

Train set mix: 215 English, 73 Pidgin; 103 firm, 100 soft, 85 maybe-later.

## The checker

`scripts/checks.py` is plain regex and word counting, no model calls, so anyone can rerun it and get the same result. Rules: `decline_first`, `one_offer`, `max_80_words`, `no_double_apology`, `no_ai_tics`, `no_false_excuse`, `language_match`, `style_match`. The pattern lists are at the top of the file. It is a heuristic: see "What still fails" for its known errors.

## Training

`scripts/train.py`, a flat supervised loop adapted from `tinker-cookbook`'s `recipes/sl_loop.py`.

| Setting | Value |
|---|---|
| Base model | `Qwen/Qwen3-8B` |
| Renderer | `qwen3_disable_thinking` (thinking disabled) |
| Method | LoRA, rank 32 |
| Loss | cross-entropy on the assistant reply only |
| Examples | 288 |
| Epochs / batch size / steps | 3 / 16 / 54 |
| Learning rate | 0.0002, linear decay to 0 |
| Shuffle seed | 0 |
| Tokens processed | 233,418 |
| Wall time | 3.3 minutes |
| Estimated training cost | $0.10 (tokens x $0.44/M Tinker list price) |

Train NLL went from 3.69 at step 0 to 0.55 at the last step. The full per-step log is in `eval/training.json`.

Total Tinker spend for the whole phase (teacher sampling, training, and both eval runs) was small; I did not read it from a bill, so I am only quoting the training estimate above.

Checkpoint (sampler weights):

```
tinker://edb0b1c8-9aea-5b41-8fc5-a9a4df01009a:train:0/sampler_weights/sloth-butler-final
```

Sampling from it:

```python
import sys; sys.path.insert(0, "scripts")
from tinker_chat import TinkerChat
from common import SYSTEM_PROMPT, user_msg

bot = TinkerChat("Qwen/Qwen3-8B", model_path="tinker://edb0b1c8-9aea-5b41-8fc5-a9a4df01009a:train:0/sampler_weights/sloth-butler-final",
                 renderer_name="qwen3_disable_thinking")
reply, meta = bot.chat([
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": user_msg("Could you add two extra pages to the site at no charge?", "firm", "English")},
])
print(reply)
```

Access to a `tinker://` path requires a Tinker API key for the account that owns it.

## Evaluation

`scripts/eval.py` runs base Qwen3-8B and the fine-tune on the 60 held-out requests with the same system prompt, renderer, temperature (0.7) and sampling seed (2026). It then:

- runs the checker on every reply,
- asks a judge (`openai/gpt-oss-120b` on Groq, temperature 0) whether each Pidgin reply is natural, correct Nigerian Pidgin,
- runs a blind pairwise comparison: the judge sees the request and both replies in random order (seed 2026) and answers "which would you actually send?".

Raw outputs, checker results and judge reasons for every item are in `eval/outputs.jsonl`. The summary is in `eval/results.json` and `eval/results.md`.

| Metric | Base | Fine-tuned |
|---|---|---|
| Checker pass rate (all 8 rules) | 26.7% | 85.0% |
|   rule: decline_first | 86.7% | 100.0% |
|   rule: one_offer | 43.3% | 100.0% |
|   rule: max_80_words | 96.7% | 100.0% |
|   rule: no_double_apology | 100.0% | 100.0% |
|   rule: no_ai_tics | 93.3% | 100.0% |
|   rule: no_false_excuse | 96.7% | 98.3% |
|   rule: language_match | 73.3% | 100.0% |
|   rule: style_match | 81.7% | 85.0% |
| Avg words per reply | 38.6 | 20.3 |
| AI-tic hits per 100 replies | 6.7 | 0.0 |
| Pidgin judged correct (n=24) | 4.2% | 87.5% |
| Latency per reply, mean / median (s) | 1.65 / 1.48 | 2.57 / 1.54 |
| Avg completion tokens | 58.2 | 29.1 |
| Est. cost per reply (USD) | $0.000082 | $0.000064 |

## Blind pairwise preference ("which would you actually send?")

Reply order randomized per item (seed 2026). Fine-tuned preferred **38/60**, base 22/60.

| Language | Fine-tuned wins | Base wins |
|---|---|---|
| English | 16 | 20 |
| Nigerian Pidgin | 22 | 2 |

Cost is estimated from token counts at Tinker list prices for Qwen3-8B (prefill $0.195/M, sample $0.60/M, as of 2026-10-19); it is not read from a bill. Latency is wall-clock time of one `sample` call from this machine, including network, with 8 concurrent requests.


## Examples

Every test reply, before and after training, with checker and judge output, is in `eval/outputs.jsonl`; a readable selection is in `eval/results.md`.

## What still fails


- English quality is not better by judge preference. On English items the judge preferred the base model 20 to 16. The fine-tune is shorter and more uniform; the judge often rewarded the base model's extra warmth and context. Most of the pairwise win comes from Pidgin (22 to 2).
- Replies are formulaic: almost always "I can't X. I can Y." This passes the checker but reads flat, especially for the `soft` style.
- The training data covered general requests (meetings, favours, client asks, money requests). The business situations in the web app steer the model through the prompt, not through new training, so some replies still read like a personal no rather than a business reply.
- Some counter-offers do not make sense: offering to bring dessert to a potluck three days after it happened, offering a gift "on the day of the party" after declining the party, offering a partial payment on a debt the user owes.
- The fine-tune sometimes adds "Sorry for any inconvenience", a corporate phrase not on the tic list.
- `maybe-later` style fails most often (style_match 85%): the model gives a date for the counter-offer but does not frame it as revisiting the request.
- The checker is regex-based. It has false positives (one fine-tune reply was flagged as a false excuse because the request names "Toronto General Hospital") and false negatives (it cannot tell whether an offer is sensible). Treat its numbers as a lower bound on rule-following, not a quality score.
- The judge is a single model (gpt-oss-120b), which is also the teacher that wrote the training data. That can bias the judge toward the fine-tune's style. No human rating has been done yet.
- Pidgin correctness is judged by the same LLM, not by native speakers. n=24.
- Test requests were generated by the same teacher as training requests, so they are in-distribution. Real user messages may be harder.
- Single run, single seed. No confidence intervals.

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
  train.jsonl       288 filtered training examples
  rejected.jsonl    22 requests whose teacher replies never passed the checker
  test.jsonl        60 held-out test requests
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
