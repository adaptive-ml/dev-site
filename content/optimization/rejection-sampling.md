---
title: "Rejection sampling"
order: 40
---

Generate many, keep the best.

For each prompt, sample N outputs and score them with a [reward model](/rewards/reward-models). Throw away everything below the top. The survivors can be used to [fine-tune](/training/post-training/sft) the model, or just returned directly. No RL algorithm. Just filtering.

The downside is cost: you generate N outputs to keep one, and the model only learns from outputs it already knew how to produce.

## Best-of-N

The same idea at inference time, without the fine-tuning step. Generate N candidates, score them, return the winner. Trades compute for quality on a per-request basis.
