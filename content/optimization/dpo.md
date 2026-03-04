---
title: "Direct Preference Optimization"
abbr: "DPO"
order: 30
---

Skip the reward model. Optimize on preferences directly.

Standard [RLHF](/rewards/rlhf) trains a [reward model](/rewards/reward-models), then runs [RL](/training/post-training/rl) against it. DPO collapses both steps into one. Given pairs of outputs where one is preferred, DPO increases the probability of the winner and decreases the loser, with a penalty to stay close to the base model.

It's supervised learning on preference data. No reward model, no RL loop, no sampling during training. The tradeoff: the model only learns from comparisons already collected. It can't explore new outputs the way [PPO](/optimization/ppo) can, where the model generates fresh candidates during training.
