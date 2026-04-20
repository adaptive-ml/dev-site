---
title: "RL from verifiable rewards"
abbr: "RLVR"
order: 50
sources:
  - title: "Tülu 3: Pushing Frontiers in Open Language Model Post-Training"
    url: "https://arxiv.org/abs/2411.15124"
    authors: "Lambert et al., Allen AI, 2024"
  - title: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning"
    url: "https://arxiv.org/abs/2501.12948"
    authors: "DeepSeek-AI, 2025"
---

Replace the reward model with a rule-based check.

Some tasks have a right answer you can check. Math problems have a final number. Code passes or fails its tests. Formatted outputs match a schema or don't. RLVR uses a rule-based check (1 for correct, 0 for incorrect) as the reward.

No [reward model](/rewards/reward-models) means no [reward hacking](/rewards/reward-hacking). But verifiable rewards only apply where correctness can be checked mechanically. Open-ended tasks still need an [AI judge](/rewards/rlaif) or a learned reward model.

[DeepSeek-R1](https://arxiv.org/abs/2501.12948) trained its reasoning model this way, pairing rule-based rewards on math and code with [GRPO](/optimization/grpo).
