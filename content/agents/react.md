---
title: "ReAct"
order: 15
---

Think, act, observe. Repeat.

[Chain-of-thought](/inference/reasoning/chain-of-thought) alone reasons without acting. [Tool use](/agents/tool-use) alone acts without reasoning. ReAct interleaves them: the model writes a reasoning trace ("I need to look up X"), takes an action (calls a tool), observes the result, then reasons about what to do next. Each thought is grounded by the previous action. Each action is informed by explicit reasoning. Most agent implementations use some version of this loop.
