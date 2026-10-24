# Sloth Butler web app

Next.js (App Router, TypeScript). Paste a request, pick a style and language, get a polite no with one counter-offer, and hear it read aloud.

## Run

```
cp .env.example .env.local   # fill in keys
npm install
npm run build && npm start   # http://localhost:3000
```

## Server routes

- `POST /api/decline` `{request, style, language, compare?}` samples the fine-tune (or both models with `compare: true`) through Tinker's OpenAI-compatible `/completions` endpoint. The prompt is rendered exactly like the training renderer (`qwen3_disable_thinking`) with the system prompt from `scripts/common.py`.
- `POST /api/voice` `{text}` returns MP3 from ElevenLabs, cached in memory and in `.cache/voice/`.
- `GET /api/eval` serves `../eval/results.json` (or `EVAL_RESULTS_PATH`).

The chime in `public/audio/declined-chime.mp3` was generated once with the ElevenLabs sound effects API.

## Environment (server only)

| Variable | Required | Notes |
| --- | --- | --- |
| `TINKER_API_KEY` | yes | |
| `MODEL_FINETUNE_PATH` | yes for the fine-tune | `tinker://.../sampler_weights/...`. If unset, replies come from the base model with a notice. |
| `BASE_MODEL` | no | Defaults to `Qwen/Qwen3-8B` |
| `ELEVENLABS_API_KEY` | yes for voice | |
| `ELEVENLABS_VOICE_ID` | no | Defaults to George (calm British male) |
| `TINKER_OAI_BASE_URL`, `EVAL_RESULTS_PATH` | no | Overrides |
