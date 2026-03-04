---
title: "Deduplication"
order: 30
---

Removing duplicate text so the model generalizes instead of memorizes.

Web crawls are full of repeated content: syndicated articles, templated pages, copy-pasted boilerplate. If duplicates stay in, the model sees them disproportionately often and starts memorizing specific passages instead of learning patterns.

## Exact deduplication

Catches identical documents. Fast, but most real-world duplication isn't exact.

## Near-deduplication

Finds documents that are similar but not identical. Techniques like [MinHash](https://huggingface.co/blog/dedup) compress each document into a compact signature, then group documents with similar signatures as likely duplicates. This catches paraphrased copies, slightly reformatted articles, and templated pages that exact matching would miss.
