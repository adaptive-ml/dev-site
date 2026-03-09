---
title: "Chain-of-thought"
order: 10
sources:
  - title: "Chain-of-thought prompting elicits reasoning in large language models"
    url: "https://arxiv.org/abs/2201.11903"
    authors: "Wei et al., 2022"
---

Making the model show its work.

LLMs can solve harder problems when they generate intermediate steps instead of jumping to the answer. Adding "let's think step by step" to a prompt is enough to trigger this. The model breaks a multi-step problem into pieces, solves each one, and arrives at a final answer. In early experiments, chain-of-thought prompting roughly tripled accuracy on math and logic benchmarks for large models.

Originally described as an **emergent ability** that only appeared above ~100B [parameters](/training/llm). Smaller models have since shown some reasoning capability, especially with better training data.

## Reasoning models

Models like OpenAI's o1 internalize this pattern through [RL](/training/post-training/rl) training rather than relying on the prompt. The chain of thought happens inside the model's generation, not because you asked for it.
