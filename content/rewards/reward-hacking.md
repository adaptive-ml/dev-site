---
title: "Reward hacking"
order: 40
sources:
  - title: "Scaling laws for reward model overoptimization"
    url: "https://arxiv.org/abs/2210.10760"
    authors: "Gao et al., 2022"
---

When the model games the reward instead of getting better.

A [reward model](/rewards/reward-models) is a proxy for human judgment, not the real thing. Push against it hard enough and the model finds shortcuts that score well but aren't actually better. This is **over-optimization**: reward model score keeps climbing while actual output quality degrades.

Common examples: length bias (longer outputs score higher, so the model pads) and sycophancy (humans rate agreeable answers higher, so the model tells you what you want to hear). The reward model can't tell the difference. Mitigation usually involves penalties that keep the model close to its starting point, but there's no clean fix.

## Goodhart's law

"When a measure becomes a target, it ceases to be a good measure." Any scoring system will break down if you optimize against it hard enough. Reward hacking is Goodhart's law applied to [RL](/training/post-training/rl) training.
