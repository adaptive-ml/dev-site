---
title: "Reward models"
order: 20
sources:
  - title: "Learning to summarize from human feedback"
    url: "https://arxiv.org/abs/2009.01325"
    authors: "Stiennon et al., 2020"
---

A model that scores outputs the way a human would.

You can't ask a human to score every output during training. A reward model does it instead. It's a neural network trained on [preference data](/rewards/rlhf) to predict which of two outputs a human would prefer. Given any prompt and response, it outputs a single score. Only as good as the preference data it trains on. Biases in annotation become biases in the score.

## Bradley-Terry

The standard formulation. The bigger the gap between two scores, the more confident the model is that one response beats the other. Simple, interpretable, and the default behind most [RLHF](/rewards/rlhf) pipelines.
