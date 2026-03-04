---
title: "Next-token prediction"
order: 20
---

Predict the next token, given all previous tokens.

That's the [self-supervised](/training/pretraining/self-supervised-learning) objective behind [pretraining](/training/pretraining). The model outputs a probability distribution over its entire vocabulary. The actual next token in the training data is the answer. Adjust the [parameters](/training/llm) to make the right token more probable. Repeat, billions of times. From this single objective, the model learns grammar, facts, reasoning, code. Not because it's told to, but because predicting well requires understanding.
