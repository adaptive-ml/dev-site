---
title: "Post-training"
order: 30
---

Turns a base model into something useful. The [foundation model](/dev-site/training#foundation-model) completes text. Post-training teaches it to follow instructions, match human preferences, and reason through problems.

Three techniques, usually applied in sequence:

- **[SFT](/dev-site/training/post-training/sft)** — supervised fine-tuning. Teaches the question-answer format.
- **Preference tuning** — [RLHF](/dev-site/rewards), [DPO](/dev-site/algorithms). Teaches style and judgment.
- **RL with verifiable rewards** — boosts performance on tasks with checkable answers (math, code).

Much less compute than [pretraining](/dev-site/training/pretraining), but disproportionate impact. Post-training doesn't teach new knowledge. It extracts and reshapes what the model already learned. A well-post-trained small model can outperform a poorly-post-trained large one.

## Fine-tuning

The general term for any training that happens after pretraining. SFT, [LoRA](/dev-site/training/post-training/lora), preference tuning, [RL](/dev-site/training/post-training/rl) — all are fine-tuning.

"Fine-tuning" is also used loosely to mean SFT specifically. Context usually makes it clear. When someone says "I fine-tuned Llama on my data," they almost always mean SFT.

The key difference from pretraining: fine-tuning starts from a trained model and uses much less data, much less compute, and a much lower learning rate. You're adjusting, not building from scratch.
