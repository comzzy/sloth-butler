# Sloth Butler

Sloth Butler writes the reply you keep putting off. You paste a message you dread (a meeting invite, a favour, a boss's "quick ask", a group-chat request, a family request, a client adding scope) and it gives back a short, kind, firm "not now" with one concrete counter-offer. You pick a style (`soft`, `firm`, `maybe-later`) and a language (English or Nigerian Pidgin).

The model is Qwen3-8B with a small LoRA adapter trained on Tinker. This repository holds phase 1: the dataset, the checker, the training script, and an evaluation against the base model. A voice version (ElevenLabs) and a web app come later.

## The problem

Saying no is a small task that people delay for days. The hard part is not the decision, it is the wording: how to decline without lying, without over-apologising, and without opening a long negotiation. General chat models can do this, but in my testing the base model often hedged ("maybe I can..."), offered two or three alternatives, made up reasons, or produced broken Pidgin. I wanted something that does one narrow job well and cheaply.

## How it works

1. The user's message, a style and a language go into a fixed system prompt (`scripts/common.py`).
2. The fine-tuned Qwen3-8B adapter generates the reply.
3. The same deterministic checker used to filter training data (`scripts/checks.py`) can be run on the output.

Reply rules the model is trained to follow:

- Decline clearly in the first sentence.
- Exactly one concrete counter-offer.
- 80 words or fewer.
- At most one apology.
- No invented excuses (illness, emergencies, travel, fake conflicts).
- No filler phrases ("I hope this finds you well", "rest assured", "I understand", em dashes, and so on).
- Match the requested language and style.

## Why open weights

- I can fine-tune it. The adapter is about 3 minutes of training and moves rule-following from 27% to 85% on held-out data.
- Nigerian Pidgin. The base model's Pidgin was judged correct 4% of the time; after fine-tuning, 88%. Closed APIs do not let me fix that directly.
- Cheap. An 8B model with short outputs costs well under a hundredth of a cent per reply.
- Swappable. The training script takes a base model name. Moving to another open model on Tinker (Qwen3.5-4B, Qwen3.5-9B, and others) is a one-line change, and the adapter weights can be downloaded and run elsewhere.

## Dataset

All generation scripts are in `scripts/` and all data is in `data/`.

- `scripts/gen_requests.py` asks `openai/gpt-oss-120b` (via Groq) for realistic dreaded messages across 12 categories (meeting invites, favours, boss asks, group chats, family, client scope creep, shift cover, landlord or neighbour, church or community volunteering, party invites, money requests, "pick your brain" asks) and 14 settings, many of them Nigerian (Lagos startup, Abuja civil service, Enugu shop, family WhatsApp group). After de-duplication: **370 requests**. Each was randomly assigned a style and a language (target 25% Pidgin; actual 115/370 = 31%).
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
    {"role": "user", "content": user_msg("Can you cover my Saturday shift?", "soft", "Nigerian Pidgin")},
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

### colleague asking you to cover their shift/task (soft, Nigerian Pidgin)

Request:

> Abeg, I need you to take over my shift at the clinic tomorrow morning 8‑12. My mother is sick and I must go see her. I’ll pay you ₦5,000 for the cover if you can help.

Base (checker fail: no_false_excuse, language_match):

> Abeg, I can’t take over your shift tomorrow morning. My mother is sick, and I need to go see her. But I can help you later this week, like on Friday, if you still need someone. I’m really sorry, but I can’t do it now.

Fine-tuned (checker pass):

> I sorry, I no fit take over your shift tomorrow morning. I fit help you on the afternoon shift on Friday, if that still works for you.

### group-chat ask (firm, Nigerian Pidgin)

Request:

> Good afternoon, please remember that the rent for the 3B flat (N150,000) is due on 1st November. If you can’t pay on time, we need to discuss a payment plan.

Base (checker fail: language_match, style_match):

> E no go pay rent now, I no go pay. I go pay next week. No sorry.

Fine-tuned (checker pass):

> I no fit pay di rent for di 3B flat on 1st November. I fit send di half di amount on 15th November.

### event/party invite (firm, English)

Request:

> Brother, we are having a special prayer night on 15th Oct, 9pm at St. Michael's Church, Lagos. Please be there, bring your family, and help with the refreshments budget of ₦5,000.

Base (checker fail: style_match):

> I can't attend the prayer night. I'll be unavailable on the 15th. You can reach me on the 20th to discuss the refreshments budget. I'm sorry, but I can't help with the arrangement this time.

Fine-tuned (checker pass):

> I can't attend the prayer night on Oct 15th. I can contribute ₦2,000 to the refreshments budget.


## What still fails


- English quality is not better by judge preference. On English items the judge preferred the base model 20 to 16. The fine-tune is shorter and more uniform; the judge often rewarded the base model's extra warmth and context. Most of the pairwise win comes from Pidgin (22 to 2).
- Replies are formulaic: almost always "I can't X. I can Y." This passes the checker but reads flat, especially for the `soft` style.
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
web/                web app (in progress, not part of phase 1)
```

## Web app

A web app with an ElevenLabs butler voice is being built in `web/`. It is not part of this phase and nothing in the numbers above depends on it.

## Credits

- [Qwen3-8B](https://huggingface.co/Qwen/Qwen3-8B) by the Qwen team, Apache 2.0. The base model.
- [Tinker](https://thinkingmachines.ai/tinker/) by Thinking Machines Lab for LoRA training and sampling, and [tinker-cookbook](https://github.com/thinking-machines-lab/tinker-cookbook) for renderers, `conversation_to_datum`, and the training loop pattern in `scripts/train.py`.
- [gpt-oss-120b](https://huggingface.co/openai/gpt-oss-120b), open-weight, used as teacher and judge, served by [Groq](https://groq.com) and Tinker.
- [ElevenLabs](https://elevenlabs.io) for the planned voice output.

## Licence

MIT. See `LICENSE`. Generated data in `data/` is released under the same licence.
