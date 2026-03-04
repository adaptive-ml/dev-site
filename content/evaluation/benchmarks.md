---
title: "Benchmarks"
order: 20
---

Standardized tests for language models.

A fixed dataset with known answers, a scoring protocol, and a [metric](/evaluation/metrics). The appeal is reproducibility: same test, same scoring, comparable results across models.

[MMLU](https://arxiv.org/abs/2009.03300) tests broad knowledge across 57 subjects. [GSM8K](https://arxiv.org/abs/2110.14168) tests grade-school math reasoning. [HumanEval](https://arxiv.org/abs/2107.03374) tests code generation against unit tests. [SWE-bench](https://www.swebench.com/) tests whether a model can fix real GitHub issues.

The risk is [Goodhart's law](/rewards/reward-hacking#goodharts-law). Once a benchmark becomes a target, models get optimized for it, and scores become less predictive of real-world quality.
