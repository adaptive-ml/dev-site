---
title: "Chatbot Arena"
order: 10
sources:
  - title: "Chatbot Arena: an open platform for evaluating LLMs by human preference"
    url: "https://arxiv.org/abs/2403.04132"
    authors: "Chiang et al., 2024"
---

Real users, real queries, anonymous models.

Two chatbots side by side. You pick the better response. The models' identities stay hidden until after you vote. Created by LMSYS (UC Berkeley), Chatbot Arena fits a [Bradley-Terry](/rewards/reward-models#bradley-terry) model to millions of head-to-head comparisons, producing rankings that track human judgment closely. The prompts are diverse, the voters are real, and the anonymous setup makes it harder to game than fixed [benchmarks](/evaluation/benchmarks).
