---
title: "Instruction data"
order: 20
sources:
  - title: "Training language models to follow instructions with human feedback"
    url: "https://arxiv.org/abs/2203.02155"
    authors: "Ouyang et al., 2022"
  - title: "The Flan Collection: designing data and methods for effective instruction tuning"
    url: "https://arxiv.org/abs/2301.13688"
    authors: "Longpre et al., 2023"
---

Structured input-output pairs for [SFT](/training/post-training/sft).

A [pretrained model](/training/pretraining) predicts the next [token](/training/pretraining/tokenization). It doesn't know how to follow instructions. Instruction data fixes that: each example is a prompt ("Summarize this article") paired with the desired response. Humans write these, or they're [generated synthetically](/data/synthetic-data).

[InstructGPT](https://arxiv.org/abs/2203.02155) used ~13,000 human-written demonstrations. The [Flan collection](https://arxiv.org/abs/2301.13688) compiled hundreds of thousands from existing academic datasets, reformatted as instructions. Quality and diversity tend to matter more than raw volume.
