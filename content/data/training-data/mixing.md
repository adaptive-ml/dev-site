---
title: "Mixing"
order: 40
sources:
  - title: "Data Mixing Laws: optimizing data mixtures by predicting language modeling performance"
    url: "https://arxiv.org/abs/2403.16952"
    authors: "Ye et al., 2024"
  - title: "DoReMi: optimizing data mixtures speeds up language model pretraining"
    url: "https://arxiv.org/abs/2305.10429"
    authors: "Xie et al., 2023"
---

Combining data sources in the right proportions.

A [pretraining](/training/pretraining) dataset isn't one corpus. It's a blend: web text, books, code, academic papers, math, conversation. The proportions matter. Too much code and the model thinks in syntax. Too little and it can't program.

## Data mixing laws

Teams used to set ratios by intuition. Now there's research: train small models on different blends, measure performance, then predict what ratio will work best at full scale. Methods like [DoReMi](https://arxiv.org/abs/2305.10429) automate this, using a small proxy model to find domain proportions that a much larger model can train on more efficiently.
