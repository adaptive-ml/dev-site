---
title: "Specialization"
order: 20
---

A focused model often beats a general-purpose one on its target task.

General-purpose models spread capacity across all of language. A model [fine-tuned](/training/post-training/sft) for a specific task concentrates that capacity where it matters. On its target domain, the specialized model tends to win on quality, cost less to run, and behave more predictably.

This is the [LoRA](/training/post-training/lora) thesis at scale: one base model, many lightweight adapters for different tasks. Share the backbone, serve multiple specializations simultaneously, and push each one further down the [cost-performance frontier](/rlops/cost-performance-frontier).
