# Landing Page Design

Build a landing page that looks human-crafted, not template-cloned. This reference is the design workflow: commit to a specific Direction before writing JSX, translate it into a Style Tile, pick one inspiration archetype, compose — then run the anti-AI grep gate.

**When to load this reference:** the user asks for a landing page, marketing page, splash page, hero section, "front page," or any public-facing page a signed-out visitor is supposed to see before deciding to sign in. Also load it if the user installed the `landing` feature from `.deepspace/features/landing/` and wants it customized to their product, or if they've said the landing page "feels generic" / "looks AI-generated" / "needs more personality."

**Skip this reference for:** the authenticated home page of a working app (that's `uiux.md` §1), maintenance tweaks to an already-themed landing page, or apps without a marketing surface (signed-in-only productivity tools).

---

## The workflow — 5 steps, in order

### 1. Decide where the landing page lives

Two paths:

- **Install the `landing` feature.** `.deepspace/features/landing/feature.json` scaffolds `src/pages/landing.tsx` + `src/components/landing/primitives.tsx` + 9 optional section components (hero typewriter, features grid, FAQ, CTA, footer, etc.). The route `/` is added, `protected: false`. This gives you a working skeleton in ~5 minutes. **Then customize aggressively** — shipping the scaffolded sections with placeholder copy swapped in is the failure mode this skill is designed to prevent.
- **Write it from scratch.** Add `src/pages/landing.tsx` yourself, add a nav/route entry in `src/nav.ts` if needed, and install `framer-motion` + `lucide-react`. Use this path when your Direction calls for a page shape the scaffolded sections can't easily produce (manifesto, long-scroll editorial, single-screen brutalism, etc.).

Either path, the rest of this workflow is the same.

### 2. Fill the Design Direction block BEFORE any JSX

At the top of `src/pages/landing.tsx`, write a prose block with two halves: a 6-prompt **brief** (product, emotion, visual metaphor, three references, signature element, hero visual) and a 6-token **Style Tile** (color, type pair, theme, art direction, motion personality, voice). The brief is prose. The Style Tile is six one-line commitments.

Put it in a multi-line comment block at the top of the file. It stays in source as documentation:

```tsx
/**
 * Design Direction
 *
 * Product: <one sentence — who it's for, what it does>
 * Emotion: <one specific feeling — not "trust" or "excitement">
 * Metaphor: <a concrete real-world image>
 * References: <three from OUTSIDE this product's category>
 * Signature: <the ONE memorable visual this page has>
 * Hero: <what animates on screen in the first 5 seconds>
 *
 * Style Tile
 * - Color: <dominant + accent + saturation>
 * - Type: <heading font + body font + why>
 * - Theme: <light | dark + why>
 * - Art direction: <one archetype from style-tile.md>
 * - Motion: <one personality from style-tile.md>
 * - Voice: <three behaviors, semicolon-separated>
 */
```

If you can't fill a prompt, you don't understand the product well enough to design for it yet — go read the rest of the app first. Load `landing-design/design-direction.md` for the full guidance on writing a good brief, and `landing-design/style-tile.md` for the Style Tile menus.

Apply the **sentence test** at the end: if everything you wrote could describe any other product, rewrite.

### 3. Read ONE inspiration archetype + its example file

Load `landing-design/inspiration-gallery.md` — it's an index of 5 archetypes across different product domains. Pick the one whose *emotion* is closest to your direction (not the one whose product category matches). Read that one row and its "what to learn" paragraph. **Do not absorb all five** — you'll produce a mashup.

Then open the corresponding example file at `landing-design/examples/0N-*.tsx` and read it end-to-end. Focus on the Design Direction block at the top — the lesson is *how a committed direction becomes concrete code*. **Do not import from the example** — it's a read-only teaching artifact and the grep gate will flag any `from.*landing-design/examples` import. Copy concepts, not files.

### 4. Compose the page

Build section by section. Load `landing-design/pattern-library.md` first — it's a tiny index (~50 lines) that lists which sub-files to load for each page section. Then load **only** the sub-file(s) you need:

- 1 nav pattern → `landing-design/pattern-library/nav.md` (or skip — some landing pages don't need a nav)
- 1 hero pattern → `landing-design/pattern-library/hero.md`
- 1–2 feature patterns → `landing-design/pattern-library/features.md` (never 3 identical cards — see rule #3)
- 0–1 social proof pattern → `landing-design/pattern-library/social-proof.md` (only if it earns its place)
- 1 CTA pattern → `landing-design/pattern-library/cta.md`
- 1 footer pattern → `landing-design/pattern-library/footer.md`
- 0–N scroll/motion patterns → `landing-design/pattern-library/scroll-motion.md` (only if your Direction calls for scroll choreography; a calm/quiet direction skips these entirely)

A typical landing page reaches for 4–5 of these files. Don't load all 7. Adapt each pattern's content and visual tokens to serve your Direction. **The pattern is the structure; your Direction is the soul.**

The scaffolded sections at `.deepspace/features/landing/src/sections/` are an alternative source — fine for a quick first pass, but:

> **Scaffold audit note.** The scaffolded `LandingPage.tsx` and `primitives.tsx` (and `GlassCard`, `PlaceholderImage`, `BrowserMockup`, `SectionHeading`) ship with `bg-foreground/[0.06]`, `border-foreground/[0.08]`, hardcoded `bg-emerald-400`, and a violet conic gradient — all of which fail the grep gate (rules #5 and #6). If you install the `landing` feature and use its sections or primitives, run the grep gate from the app root and replace every flagged line with semantic tokens (`bg-muted`, `border-border`, `bg-card`, `bg-primary/10`) before finishing. The patterns in `pattern-library.md` are already grep-clean.

### 5. Fill images, run the grep gate

- Generate atmospheric images via `integration.post('freepik/generate-image-flux-dev', ...)` or `gemini/generate-image` or `openai/generate-image` — see `references/integrations.md` and the per-integration YAML for body shapes. **Every prompt must include `no text, no words, no letters, no writing, no logos`** — AI image models render text as garbled gibberish.
- Persist generated images via `useR2Files` if you need a stable URL (otherwise the image regenerates on every render).
- Build product mockups as animated React components (inline SVG, styled divs, Framer Motion). **Never** use AI-generated images for UI screenshots.
- Fill every image slot before finishing.
- Run the grep gate (below) from the landing page directory. Any hit is a bug to fix.
- Load `landing-design/anti-ai-checklist.md` if the grep gate flags something and you need the expanded rationale.

---

## Hard rules (non-negotiable)

These are grep-checkable. Ship violations = broken landing page.

1. **Hero headline**: 3–8 words. No exceptions.
2. **Body copy**: under ~150 words total across the whole page. If you're writing a paragraph, build a visual instead.
3. **No 3-identical-cards pattern** for features. If the features section renders three of the same thing with the same structure, redesign it (tabs, alternating rows, bento grid, single showcase, etc.).
4. **No purple→indigo, violet, or blue→purple gradients.** This is the #1 AI color tell. Use your accent color in `primary` shades only.
5. **No hardcoded colors in JSX.** No hex, no `violet-400`, no `indigo-500`, no `rgb()` or `rgba()`. Semantic tokens only: `bg-background`, `text-foreground`, `bg-primary`, `bg-muted`, `border-border`, `text-muted-foreground`, etc.
6. **No fractional-opacity on foreground.** Patterns like `bg-foreground/[0.06]` or `border-foreground/[0.08]` are old-template tells. Use `bg-muted`, `border-border`, `bg-card`.
7. **Pick a font that's clear, elegant, and fits the product — never gimmicky.** Reason about the product's tone first, then pick a font that serves it. Inter, Montserrat, DM Sans, Manrope, Fraunces, Playfair Display, Cormorant, JetBrains Mono are all valid headline picks when they fit. **Avoid display fonts that read as costume:** Syne, Bebas Neue, Anton, Fjalla One, Oswald, Impact, Josefin Sans, Pacifico, Lobster. The test: would a thoughtful designer ship this font for THIS product? See `landing-design/style-tile.md`.
8. **Product mockups must be React components**, not AI-generated images.
9. **Every AI-generated image prompt must include** `no text, no words, no letters, no writing, no logos`.
10. **Dramatic type scale.** Headlines should be at least 3× the size of body text. If they look similar, the page looks flat.
11. **One commanding visual in the hero.** An animated React mockup, a full-bleed atmospheric image, or a bold environment — something. A hero that is just text on a flat background is a failure.
12. **Never ship the scaffolded `landing` feature sections verbatim.** The scaffold is a skeleton. Shipping `HeroSection` + `FeaturesGridSection` + `TestimonialsSection` + `FAQSection` with placeholder copy swapped in reproduces the exact AI-generic look this skill is designed to break.
13. **Animations must respect `prefers-reduced-motion`.** Wrap the landing tree in `<MotionConfig reducedMotion="user">` from framer-motion — that auto-disables transform/layout animations for users who request reduced motion. Manual gates are needed only for `useTransform` from `useScroll` (parallax, pinned scroll), `setInterval` / `setTimeout` / `requestAnimationFrame` loops, and CSS keyframes. Call `useReducedMotion()` and short-circuit those.
14. **No pictograph emojis (🚀 ✨ 💡 🎉 ⭐ 🔥 ❤️ 👋 etc.).** They render inconsistently across platforms and read as AI-generated. Use `lucide-react` icons or inline SVG. Plain typographic marks (`✓ ✗ → ← ↑ ↓ ★`) ARE allowed as text glyphs.

See `landing-design/anti-ai-checklist.md` for expanded rationale on every rule + the complete grep gate commands.

---

## The pre-commit grep gate (short version)

Run from the app root before finishing. Any hit is a bug. Full version with comments in `landing-design/anti-ai-checklist.md`:

```bash
cd ~/Desktop/Work/<app-name>

# hardcoded colors
grep -rnE "#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b|rgba?\([0-9]|\b(violet|indigo|purple|blue|emerald|teal|amber|rose|pink|cyan|sky|green|red|orange|yellow|lime|fuchsia)-[0-9]{3}" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null

# fractional-opacity foreground
grep -rnE "(bg|text|border)-foreground/(\[|[0-9])" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null

# pictograph emojis
grep -rnP "[\x{1F000}-\x{1FFFF}]" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null

# template copy
grep -rniE "Your DeepSpace app is running|My App|[Ll]orem [Ii]psum|streamline your|cutting.edge|state.of.the.art|next.generation|revolutionary|world.class|game.chang" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null

# TODOs
grep -rnE "TODO[: ]" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null
```

Also verify by eye:
- Design Direction block at the top of `landing.tsx` is filled with prose (no empty prompt lines)
- Hero headline is 3–8 words
- Hero has a commanding visual, not just centered text
- Features section is NOT 3 identical cards
- Every image slot is filled (either a real integration-generated URL or a code-based React visual)
- The scaffolded landing feature sections have been replaced or heavily customized — not shipped as-is

---

## Reference files (load on demand)

- **`landing-design/design-direction.md`** — how to write a good Design Direction brief. Read this the first time you fill the block, or when the sentence test keeps rejecting what you write.
- **`landing-design/style-tile.md`** — menus for the 6 Style Tile commits (color, type pair, theme, art direction, motion, voice). Open while filling the Style Tile — scan the relevant table, pick, move on.
- **`landing-design/inspiration-gallery.md`** — the 4 archetypes. Read this to pick which one row is closest to your direction. Do NOT read all four.
- **`landing-design/examples/0N-*.tsx`** — five worked example landing pages, one per archetype. Read exactly ONE after you've picked your archetype. Read-only reference — the grep gate flags imports from this folder. (See `inspiration-gallery.md` for the picking guide and which example also covers the floating-pill / FAQ / bento patterns.)
- **`landing-design/pattern-library.md`** — small index (~50 lines) of the section-specific pattern files. Read this first to know which sub-files to load.
- **`landing-design/pattern-library/{nav,hero,features,social-proof,cta,footer,scroll-motion}.md`** — copy-pasteable TSX snippets, one file per page section. Load only the sub-files you need (typically 4–5 of 7).
- **`landing-design/anti-ai-checklist.md`** — expanded hard rules + the full grep gate commands. Read this before finishing.

---

## What this reference is not

It is not a template to clone. It is not a ranked menu of "best" landing patterns. It is not a promise of world-class output on the first try. The Direction-first workflow is the point. Iterate visually until the page matches the Direction you wrote.
