---
title: "LLM-as-judge"
order: 30
sources:
  - title: "Judging LLM-as-a-judge with MT-Bench and Chatbot Arena"
    url: "https://arxiv.org/abs/2306.05685"
    authors: "Zheng et al., 2023"
---

Using a strong model to evaluate other models.

Human evaluation doesn't scale. LLM-as-judge substitutes a capable model: give it a rubric, have it score responses 1-10 or pick a winner from a pair. Cheaper and faster than human raters, and scales to thousands of comparisons.

## Known biases

**Position bias**: favoring whichever response appears first. **Verbosity bias**: longer answers score higher regardless of quality. **Self-enhancement**: models prefer their own outputs. Mitigation involves swapping positions, controlling for length, and using multiple judges.
