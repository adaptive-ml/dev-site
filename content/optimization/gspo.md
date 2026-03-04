---
title: "Group Sequence Policy Optimization"
abbr: "GSPO"
order: 25
---

[GRPO](/optimization/grpo), but clip at the sequence level.

GRPO measures and constrains changes at every token. That's noisy: individual token probabilities fluctuate, especially in **mixture-of-experts** models where different experts activate for different tokens. GSPO moves the entire optimization to the sequence level. One measurement per output, one constraint, one reward. The signal is cleaner and more stable. The algorithm behind [Qwen3](https://qwenlm.github.io/blog/gspo/), where it stabilized MoE training that GRPO struggled with.
