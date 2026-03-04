---
title: "Group Relative Policy Optimization"
abbr: "GRPO"
order: 20
---

Drop the critic. Use the group as the baseline.

[PPO](/optimization/ppo) needs a value function to estimate how good each state is. GRPO skips it. For each prompt, the model generates a group of outputs and scores them all. The **group mean** becomes the baseline: outputs above average get reinforced, below average get pushed down. No extra model to train, no extra memory.

This is the algorithm behind [DeepSeek-R1](https://arxiv.org/abs/2501.12948), where pure RL (no [SFT](/training/post-training/sft) warmup) produced strong reasoning from scratch.
