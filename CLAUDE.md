# RL Glossary

A structured glossary that makes reinforcement learning for LLMs accessible. Each entry takes a term someone would encounter and Google, and explains it clearly enough to build on.

## Audience

People who keep running into RL terms and want them explained well. They're technical enough to not need hand-holding, but new enough to the field that the jargon is a barrier.

Whiteboard energy, not Wikipedia energy.

## Scope

RL for LLMs. Not traditional RL, not all of ML.

## Structure

The tree follows the learner's path, not how a textbook organizes things. Each page earns its place through searchability, pedagogical value, or both. A concept that doesn't justify a standalone page lives as a section in its parent.

### Sub-page concepts

Concepts that don't earn their own page have two treatments:

- **Prose with bold.** The lightest touch. Bold the term on first mention, explain it in context. Use for variants, synonyms, and details that are part of the parent's explanation. No anchor link.
- **Heading (`## Section`).** Earns an anchor link (`#section-slug`) but not its own page. Use for concepts that are independently searchable or need their own explanation block, but don't justify a full page. The heading text becomes the linkable anchor via mdsvex slug generation.

When in doubt, start with prose. Promote to heading if the concept keeps getting referenced from other pages (an anchor link earns its weight). Promote to a child page if it has standalone search demand.

**Inline headings count as concepts.** They're lighter than pages but they still introduce new ideas. A page with its intro concept plus one heading is fine. Two headings is a signal to check whether children should be pages instead. Three or more means the page is doing too much. The one-concept-per-page principle applies to inline headings, not just to child pages.

Depth tiers (T1, T2, T3, etc.) refer to tree depth, not content format. T1 = top-level categories, T2 = their children, T3 = grandchildren, and so on. Inline headings can appear at any tier.

### Progressive disclosure

One concept per page. Each entry reinforces what came before. Complexity increases horizontally (across categories) and vertically (into children).

Depth signals prerequisite, not just taxonomy. A category boundary says "you need the parent context to proceed."

Parents provide shallow context for child concepts. Children restate shallowly, then deepen. Knowledge compounds with depth.

### Three reader modes

A reader may arrive at any page from nowhere (search, shared link), traverse horizontally (sibling to sibling), or traverse vertically (parent into children). The structure optimizes for all three. Every entry should feel natural whether the reader has full context or none.

### Linking

Links are how isolated readers recover context and how sequential readers get reinforcement. Two directions, different rules:

**Backlinks** (to earlier entries). The default. Slip naturally into prose with a link, no re-explanation. The link is a safety net for readers who arrived out of order. Don't re-teach concepts that were just covered; the link is enough.

**Forward links** (to later entries). Sometimes unavoidable since concepts interrelate. Tiered by distance:
- **Immediate** (child or next sibling): introduce naturally, framed as new vocabulary ("is called [X](/path)"), not as assumed knowledge.
- **Distant** (far in the tree but relevant): one-sentence tagline of the concept plus a link. "To learn more, see [X](/path)." Don't over-explain; the reader can follow if curious.
- **Unrelated**: don't mention. The tree will get there.

### Ordering gradient

Complexity increases on both axes. Across categories (horizontal): earlier categories are more fundamental, later ones assume more context. Within categories (vertical): earlier entries are more accessible, later ones get more technical. A reader traversing in either direction hits easier material first.

The category sequence follows the pipeline: Training → Data → Rewards → Optimization → Agents → Inference → Evaluation → RLOps. The first four are the core pipeline (what models are, what they eat, what "good" means, how they improve). The next three build on that: what models do autonomously (agents), how generation works (inference), and how you measure quality (evaluation). RLOps is the capstone: now that you understand the pipeline, how do you run it in production? It reframes the entire glossary through an operational and economic lens. New categories slot in by asking: "how much prior context does the reader need?"

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

### No orphan dumping

Category pages and parent pages are not catch-alls. If a concept doesn't pass the acid test as a child or inline heading of any existing page, it doesn't belong there yet. Don't attach it to the nearest category just to give it a home. Either find the page where it genuinely fits, or defer it to the backlog. A concept in the wrong place is worse than a concept that hasn't been placed yet.

### Structural intuition

The acid tests are necessary but not sufficient. Structure makes implicit promises to the reader: a subcategory promises breadth, siblings promise comparable weight, depth promises prerequisite density. When the tree passes every formal test but still feels off, check what promise the structure is making and whether the content delivers on it.

A lone child at depth 4 passes the rules but promises a subcategory that contains just one thing. Three siblings where one is trivial pass substitution but promise equal weight they don't deliver. Trust the instinct, then find the structural reason.

## Content growth

Glossary content grows via `/snowflake`. Don't skip phases: skeleton → seed → expand → refine. Most pages are currently skeleton or seed. Don't write prose for a page that hasn't had its structure approved.

## Writing

Problem before tool: when introducing a technique, establish the problem first. Let the reader connect the two.

Sentence case headings. Contractions. Fragments are fine. Vary sentence rhythm. Write how you'd explain it at a whiteboard, not how you'd write a paper.

## Contributing

Entries live in `content/` as markdown files with frontmatter (`title`, `order`, optional `abbr` for acronym pages, optional `sources` for references). Order uses gaps of 10 for easy insertion. The tree builds automatically from the filesystem. Directory = node with children (`_index.md`). File = leaf node.

### References

Entries can include a `sources` array in frontmatter. These render as a "References" section below the prose with globally unique numbers (deduplicated across the entire glossary by URL). Clicking a reference number opens a popup showing all references, with the clicked one centered. Expanding a row shows which pages cite it. The registry is built at module evaluation time in `src/lib/references.ts`. Primary sources only: arxiv papers, Nature, official project announcements. No blog explainers or course materials. Validate with `uv run --with pyyaml sandbox/validate-references.py`.

```yaml
sources:
  - title: "Paper title matching arxiv exactly"
    url: "https://arxiv.org/abs/XXXX.XXXXX"
    authors: "Last et al., YYYY"
```

### Acronym pages

Pages whose common name is an acronym use full names as the `title` and the acronym in `abbr`. The abbreviation renders as a badge in the toolbar and nav, appears in search results, and gets included in the `<title>` tag for SEO. Example: `title: "Supervised fine-tuning"`, `abbr: "SFT"`. The URL slug (filename) uses whichever form people search.

Cross-link with relative markdown paths: `[SFT](/training/post-training/sft)`. Every entry is a shareable URL.
