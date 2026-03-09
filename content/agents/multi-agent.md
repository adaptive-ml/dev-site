---
title: "Multi-agent systems"
order: 20
sources:
  - title: "How we built our multi-agent research system"
    url: "https://www.anthropic.com/engineering/multi-agent-research-system"
    authors: "Anthropic, 2025"
---

Multiple agents, each with a job.

One agent handling everything hits limits: the context window fills up, the tool set gets unwieldy, the task needs genuinely different expertise at different stages. Multi-agent systems split the work. Each agent gets its own tools, instructions, and scope.

An **orchestrator** routes tasks between them, collects results, and decides what's next. The tradeoff is coordination overhead. For simple tasks, one well-equipped agent is usually enough. Multi-agent pays off when the complexity is real: heavy parallelization, diverse tool sets, or information that won't fit in a single context.
