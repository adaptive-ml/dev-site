---
title: "Agency"
order: 25
---

The difference between a model that answers and a model that acts.

A plain LLM takes a prompt and returns text. An **agent** takes a goal and pursues it: planning steps, [calling tools](/agents/tool-use), observing results, adjusting course. The model controls the workflow, not just a single response.

It also makes training harder. Standard [RLHF](/rewards/rlhf) optimizes single-turn quality. Agent training optimizes task completion across many steps, where the reward is rare (did the whole task succeed or not?) and the model has to handle tool calls, branching decisions, and recovery from mistakes along the way.
