---
title: "Proximal Policy Optimization"
abbr: "PPO"
order: 10
---

The original algorithm behind [RLHF](/rewards/rlhf).

The model generates outputs, a [reward model](/rewards/reward-models) scores them, and PPO updates the parameters to favor higher-scoring outputs. The key constraint: a **clipping mechanism** caps how much the model can change in a single step. Without it, a big reward spike can push the model into a region it can't recover from.

PPO also trains a separate **value function** (critic) that estimates how much reward to expect, which makes training more stable. That critic roughly doubles the memory cost, which motivated simpler alternatives like [GRPO](/optimization/grpo).
