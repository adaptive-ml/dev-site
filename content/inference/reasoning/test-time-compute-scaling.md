---
title: "Test-time compute scaling"
order: 20
---

A different [scaling](/training/pretraining/scaling-laws) axis. Spend more compute when the model runs, not when it trains.

Traditional scaling makes models bigger: more parameters, more data, more training compute. Test-time compute scaling flips that. Instead of generating one answer, the model samples multiple candidates, scores them with a learned **verifier**, and picks the best. In one study, a smaller model with structured search outperformed a 14x larger model answering in one shot. The tradeoff is latency for quality: harder problems get more thinking time, easy ones don't waste it.

## Monte Carlo tree search

One mechanism for spending test-time compute. The model explores multiple reasoning paths as branches, evaluates each with a verifier, and selects the best. The core tradeoff: go wider (more candidates) or go deeper (refine existing paths).
