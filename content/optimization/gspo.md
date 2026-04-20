---
title: "Group Sequence Policy Optimization"
abbr: "GSPO"
order: 25
sources:
  - title: "Group Sequence Policy Optimization"
    url: "https://arxiv.org/abs/2507.18071"
    authors: "Zheng et al., 2025"
---

Same idea as [GRPO](/optimization/grpo). Optimize the sequence, not the token.

GRPO measures and constrains how much the model can shift its probability for each individual token. That's noisy, especially in **mixture-of-experts** models where different experts activate for different tokens. GSPO moves the unit of optimization up to the full sequence: one probability ratio per output, one constraint. Cleaner signal, more stable training.

Behind [Qwen3](https://qwenlm.github.io/blog/gspo/), where it stabilized MoE training that GRPO struggled with.
