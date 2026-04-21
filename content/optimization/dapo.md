---
title: "Decoupled Clip and Dynamic Sampling Policy Optimization"
abbr: "DAPO"
order: 27
sources:
  - title: "DAPO: an open-source LLM reinforcement learning system at scale"
    url: "https://arxiv.org/abs/2503.14476"
    authors: "Yu et al., 2025"
---

Patch [GRPO](/optimization/grpo) where long reasoning breaks it.

On long chain-of-thought tasks, GRPO hits failure modes the original paper didn't cover. Entropy collapses as the model converges on one style. Gradients vanish when every rollout in a group gets the same reward. Long correct answers get underweighted. DAPO is four targeted fixes on top of the same algorithm.

Two of them give the method its name. **Decoupled clip** raises the upper bound of the importance-ratio clip asymmetrically, so low-probability tokens have room to grow. **Dynamic sampling** drops prompts where every rollout scored 0 or 1, since those produce no gradient. The other two change the loss to weight per token instead of per sample, and soften the penalty for overlength completions.

ByteDance Seed used DAPO to reach 50 on AIME 2024 with Qwen2.5-32B, beating DeepSeek-R1-Zero on the same base model in half the training steps.
