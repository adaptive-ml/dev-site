---
title: "Speculative decoding"
order: 10
sources:
  - title: "Fast inference from transformers via speculative decoding"
    url: "https://arxiv.org/abs/2211.17192"
    authors: "Leviathan et al., 2022"
  - title: "Draft & Verify: lossless large language model acceleration via self-speculative decoding"
    url: "https://arxiv.org/abs/2309.08168"
    authors: "Zhang et al., 2023"
---

Use a small model to draft, a large model to verify.

A lightweight **draft model** guesses several tokens ahead. The large **target model** checks them all at once. Correct guesses are kept; the first wrong one gets resampled from the target. The output is identical to running the target model alone.

The speed comes from a hardware reality. Checking multiple tokens in parallel costs about the same as generating one, because the bottleneck is loading model parameters, not doing math. Speedups vary, but 2-3x is common in practice.
