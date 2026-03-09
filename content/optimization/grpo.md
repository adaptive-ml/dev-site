---
title: "Group Relative Policy Optimization"
abbr: "GRPO"
order: 20
sources:
  - title: "DeepSeekMath: pushing the limits of mathematical reasoning in open language models"
    url: "https://arxiv.org/abs/2402.03300"
    authors: "Shao et al., 2024"
  - title: "DeepSeek-R1: incentivizing reasoning capability in LLMs via reinforcement learning"
    url: "https://arxiv.org/abs/2501.12948"
    authors: "Guo et al., 2025"
---

Drop the critic. Use the group as the baseline.

[PPO](/optimization/ppo) needs a value function to estimate how good each state is. GRPO skips it. For each prompt, the model generates a group of outputs and scores them all. The **group mean** becomes the baseline: outputs above average get reinforced, below average get pushed down. No extra model to train, no extra memory.

This is the algorithm behind [DeepSeek-R1](https://arxiv.org/abs/2501.12948), where pure RL (no [SFT](/training/post-training/sft) warmup) produced strong reasoning from scratch.
