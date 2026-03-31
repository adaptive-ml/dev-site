---
title: "FAQ"
order: 100
---

## What is RL?

Reinforcement learning. Instead of showing a model the right answer, you let it try things and score the results. The model learns to produce outputs that score higher. What counts as "higher" is the [rewards](/rewards) problem. The glossary covers RL for LLMs specifically. Start with the [RL entry](/training/post-training/rl).

## What's the difference between SFT and RL?

Two ways to teach a model. **Show it the right answer** ([SFT](/training/post-training/sft)), or **let it try things and tell it what's better** ([RL](/training/post-training/rl)).

## Where does synthetic data come from?

A strong model generates [training data](/data/synthetic-data) for a weaker one. Start with real examples, generate variations, filter for quality.

## How much data do I need?

Depends on the task. Style or format changes can work with under 100 examples. [RL](/training/post-training/rl) needs less than [SFT](/training/post-training/sft) because it learns from [scores](/rewards), not labeled answers.

## Reward model or AI judge?

Both score model outputs. A **[reward model](/rewards/reward-models)** is trained to score automatically. An **[AI judge](/evaluation/llm-as-judge)** is prompted to evaluate, no training needed.