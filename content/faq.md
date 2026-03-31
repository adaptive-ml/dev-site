---
title: "FAQ"
order: 100
---

## What's the difference between SFT and RL?

Two ways to teach a model. **Show it the right answer** ([SFT](/training/post-training/sft)), or **let it try things and tell it what's better** ([RL](/training/post-training/rl)).

## Where does synthetic data come from?

A strong model generates [training data](/data/synthetic-data) for a weaker one. Start with real examples, generate variations, filter for quality.

## How much data do I need?

Depends on the task. Style or format changes can work with under 100 examples. [RL](/training/post-training/rl) needs less than [SFT](/training/post-training/sft) because it learns from [scores](/rewards), not labeled answers.

## Reward model or AI judge?

Both score model outputs. A **[reward model](/rewards/reward-models)** is trained to score automatically. An **[AI judge](/evaluation/llm-as-judge)** is prompted to evaluate, no training needed.