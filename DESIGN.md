# RL glossary — design language

The visual identity for Adaptive's developer tools. Not the brand site. Not the product UI. A third thing.

---

## Concept: Void + Strike

Ruthless emptiness. Bold marks. Nothing in between.

The void is deep, absolute, undifferentiated. No surface layers, no chrome tinting, no ambient gradients. One black. Then, the few elements that exist on it are confident and bright. Large monospace headings. Full-inversion active states. Monochrome discipline. Each element earns the space it displaces.

**Bruce Timm principle.** Few elements, each one hits. Every line, every word, every pixel of color is there because removing it would lose information. The void does the heavy lifting — it makes what remains powerful.

**Not terminal cosplay.** No green-on-black. No ASCII art. No blinking cursors. The monospace identity comes from typography choices, not from imitating a shell.

**Not the brand site in dark mode.** No gradients, no rounded cards, no warm surfaces, no marketing energy. The brand site sells. This site teaches. Different posture.

**Not a docs site.** Docs sites are utilitarian. This is an instrument. The visual identity is part of the value — shareability, recognition, authority.

---

## The rules

### 1. One void, no layers.

`#000000` everywhere. No surface hierarchy. No chrome backgrounds. Header, nav, content — all the same surface. Structure comes from typography and rules (1px borders), never from background color. The one exception: containers use the dark ink material (see Material section) — a denser pool within the void, not a separate surface.

### 2. Mono marks the strikes.

Geist Mono for headings, labels, and metadata — the moments that displace void. Geist Sans for nav, body, and UI — the comfortable reading surface. The contrast between the two creates hierarchy. The switch from mono to sans is a shape morph moment: structural → readable.

### 3. Big, not modest.

Headings are large. 36–40px mono, bold (700). They command the viewport. This isn't a settings panel — it's a publication. The size contrast between heading and body creates the hierarchy that surface colors used to provide.

### 4. Monochrome discipline.

The palette is black and white. No accent color. Hierarchy comes from brightness levels (100% → 69% → 42% → 33%) and weight (bold mono → regular sans), not from hue. When everything is monochrome, every structural choice carries more weight. If an element needs color to communicate its role, the typography and spacing aren't doing their job.

### 5. The inverted active is the signature.

Active nav items: solid `--text` background, `--void` text color, semibold weight. Full inversion. This is the most distinctive visual element — high contrast, immediately legible, impossible to miss. Keep it. It's the design equivalent of a brand mark.

### 6. Stillness, earned motion.

No scroll reveals. No gratuitous motion. Content is there. The only motion is the user scrolling.

Exceptions: the nav collapse (`Cmd+\`) animates because it's a structural change. The void gradient breathes with slow curl noise drift. Interactive elements (nav items, contact button) have a border-radius warp on hover — 4px rounded rect → 18px pill over 200ms ease. This is motion earned by interaction, matching the Adaptive website's shape-morph language. No cursor interaction with the SDF shapes — the gradient is indifferent to the pointer, which reinforces stillness.

Home page has a logo splash. Brand symbol paths fly in (900ms expo-out CSS transitions). No cards — the logo stands alone, centered in the viewport. The nav tree is the primary navigation from home.

### 7. Containers are shape language.

Borders are interactive, not decorative. A 1px border with border-radius warp on hover (4px → 18px pill) is the shape morph expressed as UI. The border starts angular and softens on interaction — faceted → organic, the brand thesis. This is the correct use of containers: structural elements that participate in the shape spectrum.

What's off-brand: drop shadows, opaque background fills, chrome panels, decorative borders that don't respond to interaction. A container that just sits there is decoration. A container that morphs is the brand. Structural fills follow the material rules (see Material section) — dense but never sealed.

---

## Tokens

```css
:root {
  /* the surface */
  --void: #000000;

  /* text — five levels, even perceptual steps */
  --text: #ffffff;         /* headings, active nav, emphasis (100%) */
  --text-body: #d9d9d9;   /* body, nav items, descriptions (85%) */
  --text-dim: #b0b0b0;    /* subtitles, secondary text (69%) */
  --text-muted: #858585;  /* small readable labels — CTAs, breadcrumbs (52%) */
  --text-faint: #555555;  /* structural/decorative — tree lines (33%) */

  /* structure — two weights */
  --rule: rgba(255,255,255,0.30);        /* dividers */
  --rule-strong: rgba(255,255,255,0.45); /* zone boundaries */
}
```

Eight tokens. Five text levels with ~15pt brightness steps between readable tiers, one structural tier (`--text-faint`) that drops further for non-text elements.

---

## Typography

### Stacks

```css
--font-body: 'Geist Variable', system-ui, -apple-system, sans-serif;
--font-mono: 'Geist Mono Variable', monospace;
```

Both open source (Vercel). Variable fonts — one file per family, any weight.

### Scale

| Element | Font | Size | Weight | Notes |
|---------|------|------|--------|-------|
| Entry heading | mono | 40px | 700 | the loudest element on any page |
| Hub/page heading | mono | 36px | 700 | secondary headings |
| Section heading | mono | 16px | 600 | within entry body |
| Site title | sans | 14px | 500 | secondary to logo, body color |
| Nav items | sans | 14px | 400 | body color |
| Nav active | sans | 14px | 600 | inverted fill — the signature |
| Nav category | mono | 11px | 400 | uppercase, 0.06em tracking, muted color |
| Category meta | mono | 12px | 400 | uppercase, tracked, muted |
| Subtitle | sans | 14px | 400 | dim color (~5:1 contrast) |
| Body paragraph | sans | 15px | 400 | 1.7 line-height, 24px gap |

**The bold move:** entry headings in large mono. Most sites use proportional for headings. Monospace headings at 36px+ are unusual, ownable, and immediately recognizable in a screenshot. The rest of the UI uses sans — the mono moments hit harder because they're earned.

---

## Layout

```
┌───────────────────────────────────────────────────────────┐
│ HEADER (64px) ────────────────────────────────────────────│
│  [logo] │ RL Glossary                          [Contact]   │
│───────────────────────────────────────────────────────────│
│           │                                               │
│  NAV      │  CONTENT                                      │
│  280px    │  max-width 720px                              │
│  Home     │                                               │
│  ├─ cat   │  CATEGORY LABEL                               │
│  └─ cat   │  Entry Heading                                │
│           │  Large. Mono. Bold.                           │
│           │                                               │
│           │  body text in proportional...                  │
│           │                                               │
└───────────────────────────────────────────────────────────┘
```

Full-bleed void. No shell padding. No app border-radius. No framing device. The instrument IS the viewport.

- **Header (64px):** Logo (18px, full opacity) + 1px rule (24px tall, `--rule`) + site title (14px sans 500, `--text-body`). Contact button on right (mono 12px uppercase, 0.08em tracking, inverted: `--text` fill, `--void` text, medium weight, 6px 16px padding, border warp on hover). Separated from body by `--rule` border.
- **Nav (440px):** Text on void. Home is the tree root; tier-1 categories are its children (always expanded, tree lines connect from Home down). All items are links (14px sans, body color). L-connectors use fixed 18px height (link vertical center). **Active path illumination:** tree lines from root to active node brighten to `--text` (white), tracing the navigation path. Inverted active. Separated from content by `--rule` border. Collapses via `Cmd+\`.
- **Toolbar:** Back button + page title at top of viewport. Back uses underline-on-hover. Title in mono 13px `--text-body`. Same `24px 48px` inset as page-nav. Hidden on home.
- **Content:** Centered horizontally and vertically in viewport (vertical centering via `margin: auto 0`, safe for scroll overflow). Prose max-width `720px`, hub links max-width `480px`. 48px padding. 24px paragraph gap. 16px body text, 1.75 line-height. Scrolls internally when content overflows. Titles live in toolbar, not content area.

### Spacing rationale

On pure void, elements need more breathing room than on surfaced backgrounds. The spacing hierarchy:

| Gap | Value | Usage |
|-----|-------|-------|
| Paragraph | 24px | between body paragraphs |
| Nav group | 24px | between category groups |
| Nav item | 6px | within a group |
| Content padding | 48px | all sides, uniform |
| Toolbar/page-nav | 24px 48px | top/bottom chrome inset |

---

## The gradient

Currently active: the void preset renders subtle SDF contours (white outline shapes at 20% brightness) as a full-screen background layer behind the frame. The shapes breathe and drift with slow curl noise — the only motion on the page. The gradient is part of the void, not layered on top of it.

---

## Material

Dark ink. The containers aren't walls on top of the void — they're pools of denser substance within it. `rgba(10, 10, 12, 0.8)` — nearly black, faint cool undertone (the 12 blue channel), 80% density. Reads as pooled ink rather than void-black. The slight color shift from pure `#000` is what gives it material presence.

| Element | Fill | Character |
|---------|------|-----------|
| Splash shapes | `rgba(255,255,255,0.04)` + white stroke | ephemeral — stroke-dominated, dissolves after entrance |
| Gradient contours | shader, ~20% brightness | ambient — the void's own texture |
| Containers (cards, hub links) | `rgba(10, 10, 12, 0.8)` | dark ink — denser void, cool-shifted, consistent across all container types |

One material for all containers. No hover fill change — the border morph and border brightening handle interaction. The material stays constant because real materials don't change density when you look at them.

**What's off-brand:** fully opaque containers (`#080808`, `#0d0d0d`). White-tinted fills (`rgba(255,255,255,0.05)`) — they glow instead of pooling. Hover-dependent fill changes — violates material consistency.

**Limitation:** `backdrop-filter: blur()` cannot reach the WebGPU gradient canvas across z-index stacking contexts. The gradient layer (z-index: 0) is invisible to backdrop-filter on elements inside the content layer (z-index: 1). Material effects are CSS-only.

---

## What makes this distinctive

In a screenshot with no URL visible, you should be able to identify this site by:

1. **Pure black void** with no surface variation
2. **Large monospace headings** — unusual at this size
3. **Inverted active state** in the nav — white fill, black text
4. **Shape-morph containers** — borders that warp from angular to pill on interaction
5. **Monochrome discipline** — hierarchy from brightness and weight, never from hue

If any element could belong to "a dark docs site," it's not bold enough.

---

## Principles

1. **Void + strike.** Empty space is active. Marks are confident.
2. **Mono marks the strikes.** Mono headings and labels are the distinctive moments. Sans is the reading surface. The contrast creates hierarchy.
3. **One surface, no color.** Complexity through typography and space, not through hue. Monochrome makes every structural choice carry more weight.
4. **Every element earns its place.** If you can remove it without losing information, remove it.
5. **Recognizable from a screenshot.** Visual identity carries as much weight as content for shareability.
6. **Not safe.** Generic dark mode is safe. This should feel like a deliberate aesthetic choice that some people won't like. That's the signal it's working.

---

## Brand compliance

This is the alien end of the Adaptive shape spectrum. Same brand DNA (see `.claude/rules/design-guidelines.md`), radically different phenotype.

**How the five brand principles express here:**

| Principle | Expression |
|-----------|------------|
| The morph, not a position | The marks within the void are alive. Hex-to-oval distortion of typography, spacing, forms. Not layered gradients underneath — manipulation of the elements themselves. |
| Adaptive by nature | The dev site IS the proof. It looks nothing like the marketing site but feels identifiably Adaptive. The mutation is the point. |
| Substance earns attention | Every element earns the space it displaces. The void does the heavy lifting. What remains is there because removing it would lose information. |
| Tension is structural | Void black meets confident bright marks. Hard monospace meets organic weight distribution. Absolute stillness meets the implied energy of compressed elements. |
| Commit fully | Pure void. No surface layers. No ambient gradients. No compromise. The intensity of the commitment is what makes it recognizable. |

**Evolution direction:** instead of layering brand gradients underneath the void (which dilutes both identities), manipulate the elements themselves. Organic distortion of typography, unexpected weight distribution, warped spacing. The void stays absolute. The strikes within it become more alive. This is Void+Strike where "strike" evolves from clinical geometry toward organic distortion.
