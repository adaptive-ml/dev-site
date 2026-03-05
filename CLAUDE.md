# RL Glossary

A structured glossary that makes reinforcement learning for LLMs accessible. Each entry takes a term someone would encounter and Google, and explains it clearly enough to build on.

## Audience

People who keep running into RL terms and want them explained well. They're technical enough to not need hand-holding, but new enough to the field that the jargon is a barrier.

Whiteboard energy, not Wikipedia energy.

## Scope

RL for LLMs. Not traditional RL, not all of ML.

## Structure

The tree follows the learner's path, not how a textbook organizes things. Each page earns its place through searchability, pedagogical value, or both. A concept that doesn't justify a standalone page lives as a section in its parent.

### Headings (T2)

A heading is a `## Section` within a page. It earns an anchor link (`#section-slug`) but not its own page. Use headings for concepts that are examples of their parent, building blocks covered in context, or terms that don't pass the standalone value test. The heading text becomes the linkable anchor via mdsvex slug generation.

### Progressive disclosure

One concept per page. Everything that page requires must come from an ancestor or a prior sibling in reading order. No forward references. Each entry reinforces what came before.

Depth signals prerequisite, not just taxonomy. A category boundary says "you need the parent context to proceed."

### Ordering gradient

Complexity increases on both axes. Across categories (horizontal): earlier categories are more fundamental, later ones assume more context. Within categories (vertical): earlier entries are more accessible, later ones get more technical. A reader traversing in either direction hits easier material first.

The category sequence follows the pipeline: Training → Data → Rewards → Algorithms → Agents → Inference → Evaluation. The first four are the core pipeline (what models are, what they eat, what "good" means, how they improve). The last three build on that: what models do autonomously (agents), how generation works (inference), and how you measure quality (evaluation). New categories slot in by asking: "how much prior context does the reader need?"

Within a category, the `order` value in frontmatter controls sequence. Values use gaps of 10 (10, 20, 30…) so new entries can slot in without renumbering siblings. Place the most broadly accessible entries first. Specialized or prerequisite-heavy entries go later. When adding entries, check what the prior sibling assumes and ensure the new entry doesn't require more background than a reader would have at that point. Files without `order` sort to the end alphabetically.

### Sibling coherence

Entries at the same level should be the same kind of thing. If a category's children are a technique, a principle, an artifact, and a failure mode, the grouping is too loose.

Test: replace any sibling in the sentence "[Parent] involves: [sibling A], [sibling B], and [this entry]." If the list doesn't scan as the same kind of thing, something needs to move, split, or regroup.

### The parent frames the question

A parent page defines what kind of thing its children are. All children should answer the same question. "What are the key training algorithms?" is a coherent frame. "What things relate to pretraining?" is too vague — it permits anything.

### Naming reflects type

Siblings should use similar grammatical forms. When one sibling is a process noun ("tokenization"), another is an artifact ("foundation model"), and a third is a principle ("scaling laws"), the naming asymmetry signals a grouping problem.

### Schema coherence

After reading three entries in a group, a reader should be able to predict what kind of thing the fourth entry will be. If they can't, the organizing principle is too broad.

### Depth balance

The tree doesn't need to be perfectly balanced, but extreme asymmetry (one branch 3 levels deep, another with 1) signals under-specification or over-nesting.

### Structural intuition

The acid tests are necessary but not sufficient. Structure makes implicit promises to the reader: a subcategory promises breadth, siblings promise comparable weight, depth promises prerequisite density. When the tree passes every formal test but still feels off, check what promise the structure is making and whether the content delivers on it.

A lone child at depth 4 passes the rules but promises a subcategory that contains just one thing. Three siblings where one is trivial pass substitution but promise equal weight they don't deliver. Trust the instinct, then find the structural reason.

## Writing

Problem before tool: when introducing a technique, establish the problem first. Let the reader connect the two.

Sentence case headings. Contractions. Fragments are fine. Vary sentence rhythm. Write how you'd explain it at a whiteboard, not how you'd write a paper.

## Contributing

Entries live in `content/` as markdown files with frontmatter (`title`, `order`). Order uses gaps of 10 for easy insertion. The tree builds automatically from the filesystem. Directory = node with children (`_index.md`). File = leaf node.

Cross-link with relative markdown paths: `[SFT](/dev-site/training/post-training/sft)`. Every entry is a shareable URL. The `/dev-site` prefix is the base path (set in `svelte.config.js`).
