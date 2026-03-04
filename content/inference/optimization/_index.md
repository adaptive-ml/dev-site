---
title: "Optimization"
order: 20
---

Making inference faster and cheaper without losing quality.

Generation is sequential: one [token](/training/pretraining/tokenization) at a time, each depending on the last. The GPU spends most of its time loading model parameters from memory, not doing math. That bottleneck creates room for speedups.
