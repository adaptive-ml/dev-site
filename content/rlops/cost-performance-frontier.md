---
title: "Cost-performance frontier"
order: 10
---

Better models cost more to run. The frontier is the best quality you can get at each price point.

For any task, there's a curve: model quality on one axis, inference cost on the other. Frontier models sit at the top right. Expensive, capable. Smaller models sit at the bottom left. Cheap, limited. The **cost-performance frontier** traces the boundary between them.

[Fine-tuning](/training/post-training/sft) and [RL](/training/post-training/rl) shift this curve. A [specialized](/rlops/specialization) 7B model can match a general-purpose 70B on its target task at a fraction of the cost per token. The real question isn't which model is best. It's where to sit on the frontier, and when retraining justifies the cost of moving.
