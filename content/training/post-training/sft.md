---
title: "Supervised fine-tuning"
abbr: "SFT"
order: 10
sources:
  - title: "Training language models to follow instructions with human feedback"
    url: "https://arxiv.org/abs/2203.02155"
    authors: "Ouyang et al., 2022"
---

Train on input-output examples to teach a model a task or format.

[Pretraining](/training/pretraining) is [self-supervised](/training/pretraining/self-supervised-learning). No human labels. SFT adds them back. Humans write the examples: "Summarize this article" → a good summary. "Translate to French" → a correct translation. Thousands of these pairs. The model adjusts its [parameters](/training/llm) to produce outputs that match.

## Instruction tuning

SFT on instruction-response pairs. The step that turns a [foundation model](/training/llm) into a chatbot. The model learns to follow directions: answer questions, refuse harmful requests, stay on topic. Most conversational AI starts here.
