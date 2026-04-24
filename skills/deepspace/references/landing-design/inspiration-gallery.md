# Inspiration Gallery

Four archetypal landing-page directions across radically different product domains. They exist to prove one thing: **landing pages look different per product when the designer commits to a specific direction**. Pick the one whose *emotion* is closest to the direction you've committed to, and let its Style Tile + signature element inform your own — without cloning the page.

## Rules

1. **Read only ONE row below.** Pick based on emotional adjacency, not product category. A cooking app might learn more from the dev-tool row if its tone is technical; a game might learn more from the cooking row if its tone is nostalgic. Don't absorb all four — you'll end up with a mashup.
2. **Focus on how the direction becomes code**, not on copying layouts. The lesson is that every design choice in the example traces back to its Design Direction.
3. **Do NOT clone the layout.** Adapt the underlying idea. If the cooking example uses torn-paper dividers, your cooking app might use pressed-flower dividers — same *mechanism* (a signature SVG element that repeats), different *execution* (specific to your direction).

## The four archetypes

| # | Archetype | Emotion | Visual metaphor | Signature element | Style Tile shorthand |
|---|---|---|---|---|---|
| 01 | Cooking / warmth | Sunday kitchen warmth, nostalgic, tactile | A handwritten recipe card on a butcher-block table, morning light through a window | Torn-paper SVG section dividers | Warm cream + terracotta · Fraunces + Source Sans 3 · light · editorial · subtle drift · second-person, no em dashes, warm |
| 02 | Developer tool / precision | Sharp, confident, technical, precise | A blinking cursor in a dark server room, code compiling in real time | A live terminal in the hero that types real commands with realistic variable timing | Slate + cyan accent · JetBrains Mono + Inter · dark · modern minimalism · mechanical · terse, no adjectives, verb-first |
| 03 | Meditation / calm | Spacious calm, weightless, present | The horizon line at dawn, the pause between breaths | A breath circle pulsing at 4.5s per cycle as the hero centerpiece | Cream + sage · Cormorant + Lato · light · modern minimalism · stillness · lyrical, generous sentences, no urgency |
| 04 | Children's storybook / playful | Playful, imaginative, tactile, safe | A paper cut-out diorama, crayon scribbles on construction paper | Hand-drawn SVG elements that wobble + paper grain texture overlay | Warm yellow + coral · Nunito + Nunito · light · hand-drawn illustrated · playful bouncy · second-person, short questions, joyful |

## How to pick

Read the four rows above. Ask: *which "emotion" column is closest to the emotion I committed to in my Design Direction?*

- Is your product warm, tactile, nostalgic, editorial? → **01 cooking-warmth**
- Is your product sharp, technical, precise, confident, data-dense? → **02 devtool-precision**
- Is your product spacious, calm, soft, minimal, wellness-oriented? → **03 meditation-calm**
- Is your product playful, bright, imaginative, tactile, hand-crafted? → **04 kids-storybook**

If none of the four feels close, pick the closest *metaphor* instead of closest emotion. If none of the metaphors feels close either, pick the one whose **signature element** has the most transferable *mechanism* (dividers, terminal, breath circle, wobble animation) — you can adapt the mechanism to your own context.

## What to learn from each archetype

**01 — Cooking / warmth.** The lesson: texture and imperfection signal hand-made. The torn-paper dividers aren't decoration — they're a recurring structural element that tells your eye "this is a zine, not a dashboard." Muted earth tones + a serif that has warmth (Fraunces has variable axis for warmth specifically) + paper grain overlay + zero glassmorphism.

**02 — Developer tool / precision.** The lesson: restraint IS the identity. Dark slate + exactly one accent + monospace + mechanical easings. The live terminal is the hero's entire job — no supporting illustration, no decorative gradient, no testimonials scrolling sideways. Everything that isn't the terminal is background.

**03 — Meditation / calm.** The lesson: motion serves the emotion. A 4.5-second breath cycle is almost too slow for the web's usual rhythm — and that's the whole point. The slowness is what makes it feel like meditation. A faster pulse (1.5s, 2s) would read as "a loading spinner" and destroy the direction.

**04 — Children's storybook / playful.** The lesson: imperfection is a design choice, not a failure of polish. Wobble animations, slightly-wonky SVG paths, mismatched but coordinated colors, grain overlay, rounded-everything. The grain + wobble combo is the single thing that moves the page from "generic kids app template" to "feels like construction paper."

## Why only four archetypes

Four is enough to prove the range. More is a bigger menu, and menus cause cloning.

If none of the four matches your direction and you need a different reference, the right move isn't to wait for a fifth archetype — it's to find your own reference outside this repo (a real landing page, a magazine spread, a product photograph) that shares your emotion, and build from that.

## What reference code NOT to rely on

Don't clone the scaffolded landing feature's sections (`.deepspace/features/landing/`) verbatim. They're a pre-built skeleton of "typewriter hero + 9 section variants" — useful as structural scaffolding, not as a finished page. If your Direction is closer to archetype 01 (warm/editorial), you'll probably throw most of the scaffolded sections away and build your own from patterns that match — grain overlay, paper-dividers, asymmetric two-column body. If your Direction is closer to archetype 02 (dev-tool precision), the scaffolded FAQ accordion and testimonial carousel are probably both wrong. Direction > scaffold.
