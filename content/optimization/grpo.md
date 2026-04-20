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

Generate a group. Reward what beats the average.

For each prompt, GRPO generates a group of outputs and scores them all. The **group mean** becomes the baseline: above-average outputs get reinforced, below-average ones pushed down. That's the whole algorithm.

The group serves as both the training signal and a local estimate of what "good" looks like on this prompt. Cheap on memory, simple to implement.

Behind [DeepSeek-R1](https://arxiv.org/abs/2501.12948), where pure RL with no [SFT](/training/post-training/sft) warmup produced strong reasoning from scratch.
