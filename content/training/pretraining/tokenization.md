---
title: "Tokenization"
order: 10
sources:
  - title: "Neural machine translation of rare words with subword units"
    url: "https://arxiv.org/abs/1508.07909"
    authors: "Sennrich et al., 2015"
---

Splitting text into the pieces a model actually reads.

Models can't process raw text. Tokenization breaks it into **tokens**: subword chunks. Whole words would mean a huge vocabulary. Individual characters would mean very long sequences. Subwords split the difference. The standard algorithm, **BPE** (byte pair encoding), builds a vocabulary by merging the most frequent character pairs. When we say an [LLM](/training/llm) predicts the "next word," it's really predicting the [next token](/training/pretraining/next-token-prediction).
