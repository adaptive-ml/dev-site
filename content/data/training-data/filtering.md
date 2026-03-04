---
title: "Filtering"
order: 20
---

Turning a raw [web crawl](/data/training-data/web-crawl) into a usable dataset. Most pipelines stack two passes.

## Heuristic filters

Rules that strip HTML boilerplate, remove documents that are too short or too repetitive, and flag language mismatches. Cheap and fast. Cuts 20-40% of the crawl.

## Classifier-based filters

A small model trained to distinguish high-quality text (Wikipedia, books) from low-quality text (SEO spam, auto-generated pages) scores each document. Everything below a threshold gets dropped. Toxic and harmful content gets its own classifier pass. What survives is maybe 10-15% of the original crawl.
