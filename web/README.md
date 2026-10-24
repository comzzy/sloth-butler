# Sloth-Butler web app

Next.js (App Router, TypeScript). Save your terms once (rate, minimum, discount limit, payment terms, late fee), pick a situation, paste the message, and get a polite, firm reply that uses your real numbers. Late invoices and quiet clients get a three-step follow-up plan on a local board. Copy it, play it, or download it as an mp3. Live at https://sloth-butler.vercel.app.

## Run

```
cp .env.example .env.local   # fill in keys
npm install
npm run build && npm start   # http://localhost:3000
```

## Server routes

- `POST /api/decline` `{request, style, language, scenario?, context?: {rate, deadline, notes}, compare?}` samples the fine-tune (or both models with `compare: true`) through Tinker's OpenAI-compatible `/completions` endpoint. The prompt is rendered exactly like the training renderer (`qwen3_disable_thinking`) with the system prompt from `scripts/common.py`; the situation and context are appended to the user message.
- `POST /api/voice` `{text}` returns MP3 from ElevenLabs, cached in memory and in `.cache/voice/`.
- `GET /api/eval` serves `../eval/results.json` (or `EVAL_RESULTS_PATH`).

The protected-hours log is client-side only (`localStorage`, key `sloth-butler-protected-v2`).

## Environment (server only)

| Variable | Required | Notes |
| --- | --- | --- |
| `TINKER_API_KEY` | yes | |
| `MODEL_FINETUNE_PATH` | yes for the fine-tune | `tinker://.../sampler_weights/...`. If unset, replies come from the base model with a notice. |
| `BASE_MODEL` | no | Defaults to `Qwen/Qwen3-8B` |
| `ELEVENLABS_API_KEY` | yes for voice | |
| `ELEVENLABS_VOICE_ID` | no | Defaults to Alice (calm British female, a premade voice that works on the free plan) |
| `TINKER_OAI_BASE_URL`, `EVAL_RESULTS_PATH` | no | Overrides |
