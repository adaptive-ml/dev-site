---
title: "Trillion token pressure"
order: 30
sources:
  - title: "Will we run out of data? Limits of LLM scaling based on human-generated data"
    url: "https://epoch.ai/blog/will-we-run-out-of-data-limits-of-llm-scaling-based-on-human-generated-data"
    authors: "Villalobos et al., Epoch AI, 2022"
---

[Pretraining](/training/pretraining) needs more data than exists.

A compute-optimal 1T parameter model needs roughly 20 trillion tokens (about 20 tokens per parameter, per [scaling laws](/training/pretraining/scaling-laws)). That's about seven times the deduplicated Common Crawl. Usable public text is finite, and frontier models are approaching the limits of what's available.

Frontier runs already cost hundreds of millions of dollars across thousands of GPUs. Only a handful of labs can play this game. For everyone else, the path is [post-training](/training/post-training): take an open-source base model and [specialize](/rlops/specialization) it with [SFT](/training/post-training/sft) and [RL](/training/post-training/rl). The economics of pretraining make fine-tuning not just convenient but necessary.
