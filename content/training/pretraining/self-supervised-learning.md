---
title: "Self-supervised learning"
order: 15
---

Training without human labels.

In **supervised learning**, humans label the data: "this email is spam," "this image is a cat." The model learns from the labels. That works, but labeling is expensive. You can't hand-annotate trillions of tokens.

Self-supervised learning sidesteps this: construct a task where the answer is already in the data. Hide part, predict it from the rest. For [LLMs](/training/llm), that task is [next-token prediction](/training/pretraining/next-token-prediction): given every token so far, predict what follows. The "label" is whatever actually came next.
