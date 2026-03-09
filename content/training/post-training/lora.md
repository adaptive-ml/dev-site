---
title: "Low-Rank Adaptation"
abbr: "LoRA"
order: 20
sources:
  - title: "LoRA: low-rank adaptation of large language models"
    url: "https://arxiv.org/abs/2106.09685"
    authors: "Hu et al., 2021"
  - title: "QLoRA: efficient finetuning of quantized LLMs"
    url: "https://arxiv.org/abs/2305.14314"
    authors: "Dettmers et al., 2023"
---

Train a small adapter instead of the full model.

Full [SFT](/training/post-training/sft) updates every [parameter](/training/llm) in the model. For a 7B model, that's expensive. LoRA freezes the original parameters and adds a tiny set of new ones to specific layers. Typically less than 1% of the model. Train those, leave everything else untouched. The result is a lightweight adapter that can be swapped in and out: one base model, many specializations.

## QLoRA

LoRA still loads the full frozen model into memory. QLoRA shrinks it first: aggressively compress the base model, then train the adapter on top. Uses a fraction of the memory, runs faster, and makes fine-tuning possible on hardware that couldn't hold the original model.
