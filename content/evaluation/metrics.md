---
title: "Metrics"
order: 40
---

The numbers attached to evaluation.

## Automatic metrics

**Perplexity** measures how surprised the model is by text. Lower means better prediction. Cheap to compute, but only captures confidence, not correctness or usefulness.

**Pass@k** measures whether at least one of k generated solutions passes a correctness check (usually unit tests for code).

## Judgment-based metrics

**Win rate** counts how often a model is preferred in pairwise comparisons. Requires human raters or an [LLM judge](/evaluation/llm-as-judge).

Automatic metrics are cheap but narrow. Judgment-based metrics capture what actually matters but are expensive and noisy.
