# Eval: base Qwen3-8B vs Sloth Butler replies LoRA

Held-out set: 100 messages (`data/test.jsonl`). Checkpoint `tinker://ea588015-cff4-5702-99e8-ce0bf3d5af5b:train:0/sampler_weights/sloth-butler-replies`. Judge openai/gpt-oss-120b, rubric in `scripts/judge.py`, pass = score >= 4/5.

| Metric | Base | Fine-tuned |
|---|---|---|
| All criteria pass | 41% | 63% |
| sendable | 84% | 93% |
| firm but polite | 84% | 97% |
| has counter offer | 74% | 90% |
| fits scenario | 67% | 76% |
| correct language | 90% | 94% |
| Avg words | 51.1 | 34.4 |
| Pidgin correct (n=10) | 10% | 50% |

Blind pairwise: fine-tuned preferred 56/100.
