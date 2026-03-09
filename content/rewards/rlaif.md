---
title: "RL from AI feedback"
abbr: "RLAIF"
order: 30
sources:
  - title: "Constitutional AI: harmlessness from AI feedback"
    url: "https://arxiv.org/abs/2212.08073"
    authors: "Bai et al., Anthropic, 2022"
---

Replace human annotators with a stronger model.

Same [RLHF](/rewards/rlhf) pipeline, different feedback source. Instead of humans comparing outputs, an AI judge generates the [preference data](/rewards/rlhf). Cheaper, faster, more consistent. But it inherits the judge model's blind spots and biases. If the judge can't tell when an answer is wrong, the [reward model](/rewards/reward-models) won't learn to penalize it.

## Constitutional AI

The most well-known RLAIF variant. Introduced by Anthropic. Instead of learning from raw preference comparisons, the model critiques and revises its own outputs against a set of written principles. The "constitution" is the reward signal.

The model generates a response, evaluates whether it violates any principle, rewrites if needed, and those revisions become training data. Reduces the annotation bottleneck, though the quality depends on how well the principles cover real failure modes.
