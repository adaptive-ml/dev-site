---
title: "Tool use"
order: 10
---

Models calling external tools instead of guessing.

LLMs struggle with reliable math, can't access live data, can't take actions in other systems. Tool use closes that gap. The model generates a structured call (function name + arguments) instead of a natural language answer. A runtime executes the call and feeds the result back. The model never runs anything itself. It decides *what* to call and *why*. The runtime handles execution.

## Function calling

The modern implementation. The model outputs structured data matching a defined format, not free-text that needs parsing. More reliable than older [ReAct](/agents/react)-style text extraction, but the conceptual loop is the same: the model requests an action, something else executes it, the result comes back as context.
