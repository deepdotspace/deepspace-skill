# Inspiration Gallery

Five archetypal landing-page directions across radically different product domains. They exist to prove one thing: **landing pages look different per product when the designer commits to a specific direction**. Pick the one whose *emotion* is closest to the direction you've committed to, and let its Style Tile + signature element inform your own — without cloning the page.

## Rules

1. **Read only ONE row below** AND **only ONE example file.** Pick based on emotional adjacency, not product category. A cooking app might learn more from the dev-tool row if its tone is technical; a game might learn more from the cooking row if its tone is nostalgic. Don't absorb all five — you'll end up with a mashup.
2. **Focus on how the direction becomes code**, not on copying layouts. Open the example file for your chosen archetype and read the Design Direction block at the top. The lesson is that every design choice downstream traces back to what's written there.
3. **Do NOT clone the layout.** Adapt the underlying idea. If the cooking example uses torn-paper dividers, your cooking app might use pressed-flower dividers — same *mechanism* (a signature SVG element that repeats), different *execution* (specific to your direction).
4. **Do NOT import from the examples folder.** Each example file opens with a do-not-import comment. The grep gate in `anti-ai-checklist.md` flags `from.*landing-design/examples` — a hit is a bug. Copy concepts, not files.

## The five archetypes

| # | Archetype | Emotion | Visual metaphor | Signature element | Example file |
|---|---|---|---|---|---|
| 01 | Cooking / warmth | Sunday kitchen warmth, nostalgic, tactile | A handwritten recipe card on a butcher-block table, morning light through a window | Torn-paper SVG section dividers | `examples/01-cooking-warmth.tsx` |
| 02 | Developer tool / precision | Sharp, confident, technical, precise | A blinking cursor in a dark server room, code compiling in real time | A live terminal in the hero that types real commands with realistic variable timing | `examples/02-devtool-precision.tsx` |
| 03 | Meditation / calm | Spacious calm, weightless, present | The horizon line at dawn, the pause between breaths | A breath circle pulsing at 4.5s per cycle as the hero centerpiece | `examples/03-meditation-calm.tsx` |
| 04 | Children's storybook / playful | Playful, imaginative, tactile, safe | A paper cut-out diorama, crayon scribbles on construction paper | Hand-drawn SVG elements that wobble + paper grain texture overlay | `examples/04-kids-storybook.tsx` |
| 05 | SaaS / clarity | The Friday-afternoon recap that lets the laptop close | A one-page-per-week paper folio in a manager's bottom drawer | An animated bento dashboard mockup that runs once on entry: chart draws itself, status flips, recap paragraph types in | `examples/05-saas-clarity.tsx` |

**Style Tile shorthand per row** (the full tile lives at the top of each example file):

- 01 — Warm cream + terracotta · Fraunces + Source Sans 3 · light · editorial · subtle drift · second-person, no em dashes, warm.
- 02 — Near-black + cyan accent · IBM Plex Mono + Inter · dark · modern minimalism · mechanical · verb-first, no adjectives, max 10 words.
- 03 — Cream + sage · Cormorant + Lato · light · modern minimalism · stillness · generous sentences, no urgency words.
- 04 — Warm yellow + coral · Nunito only · light · hand-drawn illustrated · playful bouncy · second-person, short questions, joyful.
- 05 — Warm off-white + ink-blue + moss-green status · Inter + IBM Plex Mono · light · bento-modular with editorial restraint · subtle drift · declarative, second-person, max 14 words, no exclamation points.

**Example 05 also doubles as the worked reference for the N1 dual-state floating-pill nav with active-section highlighting + FAQ accordion + bento hero with animated React mockup** — three patterns common enough in SaaS landings that having a worked composition saves you re-deriving them.

## How to pick

Read the five rows above. Ask: *which "emotion" column is closest to the emotion I committed to in my Design Direction?*

- Is your product warm, tactile, nostalgic, editorial? → **01 cooking-warmth**
- Is your product sharp, technical, precise, confident, data-dense? → **02 devtool-precision**
- Is your product spacious, calm, soft, minimal, wellness-oriented? → **03 meditation-calm**
- Is your product playful, bright, imaginative, tactile, hand-crafted? → **04 kids-storybook**
- Is your product polished SaaS — clear, decision-oriented, made for the close of a workweek? → **05 saas-clarity**

If none of the five feels close, pick the closest *metaphor* instead of closest emotion. If none of the metaphors feels close either, pick the one whose **signature element** has the most transferable *mechanism* (dividers, terminal, breath circle, wobble, bento-mockup-on-load) — you can adapt the mechanism to your own context.

## What to look for when reading the example file

Once you've picked, open `examples/0N-*.tsx` and read in this order:

1. **The Design Direction block at the top.** Read it slowly. Notice how each prompt is answered in *prose with concrete imagery*, not bullets. Notice how the sentence test would obviously fail for any other product. This is the quality bar you're aiming for in your own Direction.
2. **The signature element implementation.** How is it built? Inline SVG? Styled divs? A framer-motion loop? This is the single thing that makes the page memorable — the mechanism is usually transferable even when your execution is completely different.
3. **The typography + color commitments** in the Style Tile. Each example commits to a specific type pair and one accent — semantic tokens only, but radically different visual identities. This is the existence proof that "same token system" ≠ "same visual identity."
4. **The motion personality.** Some examples move a lot, some barely move. The personality comes from the direction, not from "use framer-motion everywhere."

After reading, close the example file and go compose your own page. **Don't keep the example open while you write** — you'll copy it.

## What to learn from each archetype

**01 — Cooking / warmth.** The lesson: texture and imperfection signal hand-made. The torn-paper dividers aren't decoration — they're a recurring structural element that tells your eye "this is a zine, not a dashboard." Muted earth tones + a serif that has warmth (Fraunces has variable axis for warmth specifically) + paper grain overlay + zero glassmorphism.

**02 — Developer tool / precision.** The lesson: restraint IS the identity. Dark slate + exactly one accent + monospace + mechanical easings. The live terminal is the hero's entire job — no supporting illustration, no decorative gradient, no testimonials scrolling sideways. Everything that isn't the terminal is background.

**03 — Meditation / calm.** The lesson: motion serves the emotion. A 4.5-second breath cycle is almost too slow for the web's usual rhythm — and that's the whole point. The slowness is what makes it feel like meditation. A faster pulse (1.5s, 2s) would read as "a loading spinner" and destroy the direction.

**04 — Children's storybook / playful.** The lesson: imperfection is a design choice, not a failure of polish. Wobble animations, slightly-wonky SVG paths, mismatched but coordinated colors, grain overlay, rounded-everything. The grain + wobble combo is the single thing that moves the page from "generic kids app template" to "feels like construction paper."

## Why only five archetypes

Five is enough to prove the range. More is a bigger menu, and bigger menus cause cloning.

If none of the five matches your direction and you need a different reference, the right move isn't to wait for a sixth archetype — it's to find your own reference outside this repo (a real landing page, a magazine spread, a product photograph) that shares your emotion, and build from that.

## What reference code NOT to rely on

Two failure modes, same root cause (skipping the Direction-first workflow):

- **Don't clone the scaffolded landing feature's sections** (`.deepspace/features/landing/`) verbatim. They're a pre-built skeleton of "typewriter hero + 9 section variants" — useful as structural scaffolding, not as a finished page. If your Direction is closer to archetype 01 (warm/editorial), you'll probably throw most of the scaffolded sections away. If your Direction is closer to archetype 02 (dev-tool precision), the scaffolded FAQ accordion and testimonial carousel are probably both wrong. The scaffold also ships with rule-violating tokens (`bg-foreground/[X]`, hardcoded colors) that need cleanup — see the scaffold audit note in `landing-design.md`.
- **Don't import from `landing-design/examples/`.** The examples are a teaching artifact. Copy-pasting from them produces "every cooking app is this cooking example" clone syndrome, which is exactly the failure mode the Direction-first workflow was designed to break. The grep gate catches illegal imports.

Direction > scaffold > example. The Direction you commit to is the soul of the page. Patterns are structure. Examples are how other directions turned into structure for a different product.
