---
title: "RL from human feedback"
abbr: "RLHF"
order: 10
sources:
  - title: "Deep reinforcement learning from human preferences"
    url: "https://arxiv.org/abs/1706.03741"
    authors: "Christiano et al., 2017"
  - title: "Training language models to follow instructions with human feedback"
    url: "https://arxiv.org/abs/2203.02155"
    authors: "Ouyang et al., 2022"
---

Humans rank outputs. A model learns their preferences. RL optimizes against it.

Open-ended tasks have no correct answer to train on. RLHF turns human judgment into a training signal instead.

Annotators compare pairs of model outputs and pick the better one. Those comparisons become **preference data**: a dataset of (prompt, chosen response, rejected response) triples.

A [reward model](/rewards/reward-models) trains on this data to predict which output a human would prefer. Then [RL](/training/post-training/rl) uses those scores to improve the language model. The human is no longer in the loop for every training step, just for providing the initial comparisons.
