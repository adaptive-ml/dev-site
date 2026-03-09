---
title: "Web crawl"
order: 10
sources:
  - title: "Common Crawl overview"
    url: "https://commoncrawl.org/overview"
    authors: "Common Crawl Foundation"
---

Where most [training data](/data/training-data) starts.

Nearly every major LLM trains on some version of [Common Crawl](https://commoncrawl.org/overview), a nonprofit archive that snapshots the public web. The raw archive is billions of pages and growing. But most of it is boilerplate, spam, duplicate nav bars, cookie banners. The crawl isn't a dataset. It's the ore. Everything downstream ([filtering](/data/training-data/filtering), [deduplication](/data/training-data/deduplication)) exists because the raw crawl is overwhelmingly noise.
