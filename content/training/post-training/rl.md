---
title: "Reinforcement learning"
abbr: "RL"
order: 30
---

Learning from rewards instead of examples.

[SFT](/training/post-training/sft) needs a correct answer for every input. But for open-ended tasks, there's no single right answer. RL takes a different approach: let the model generate outputs, score them, and adjust toward higher scores. No labeled examples. Just a signal for what's better and what's worse. Defining that signal is the problem [rewards](/rewards) address.
