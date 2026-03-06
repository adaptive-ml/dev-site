---
title: "Training data"
order: 10
---

- The raw text corpus used for pretraining. Scraped, cleaned, assembled. Covers where it comes from and how it gets processed.

## Web crawl

- Where most training data starts. Common Crawl, web scraping. Petabytes of text, most of it noise.

## Filtering

- Turning a raw crawl into a usable dataset. Language detection, quality classifiers, toxic content removal.

## Deduplication

- Removing near-duplicate text. n-gram overlap, MinHash. Duplicated data biases toward memorization over generalization.

## Mixing

- Combining data sources in the right proportions. Code, text, math, conversation. The ratio shapes the model's capabilities.
