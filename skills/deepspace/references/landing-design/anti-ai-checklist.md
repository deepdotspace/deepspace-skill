# Anti-AI Checklist + Pre-commit Grep Gate

The hard rules from `landing-design.md` expanded with rationale, plus the complete grep gate commands. Read this before finishing a landing page.

## The 14 hard rules (expanded)

### 1. Hero headline: 3–8 words

Long headlines explain. Short headlines commit. Linear's hero is "Linear is built for speed." Four words. Vercel's is "Develop. Preview. Ship." Three. If your headline is 12 words trying to describe what the product does *and* who it's for *and* why it's different, the landing page is already failing — shorten it until you can't anymore.

### 2. Body copy: under ~150 words total across the whole page

If you're writing a paragraph to explain a feature, you're telling when you should be showing. Build a visual instead. The best landing pages communicate their value with near-zero prose — the visuals do the talking.

### 3. No 3-identical-cards pattern for features

Three `<Card>` components in a row with `Icon + Title + Description` is the #1 AI-generated layout tell. It's the default because it's safe and because templates ship with it. Break out of it: tabbed showcase, alternating rows, bento grid, single scrolling showcase, typographic list.

### 4. No purple→indigo, violet, or blue→purple gradients

This is the #1 AI color tell. Every generic SaaS AI product picks a purple-indigo gradient because it's the safest choice. Don't. Use your accent color in `primary` shades only. If your app's `primary` is purple, that's fine — but use only `primary`, not `violet-500` hardcoded. The gradient should be primary-to-primary/70, not primary-to-indigo.

### 5. No hardcoded colors in JSX

No hex (`#8b5cf6`), no Tailwind color names (`violet-400`, `indigo-500`, `amber-300`), no `rgb()` or `rgba()` literals. Semantic tokens only: `bg-background`, `text-foreground`, `bg-primary`, `text-primary`, `bg-muted`, `text-muted-foreground`, `bg-card`, `border-border`, `bg-accent`, `text-accent-foreground`. Radical visual differences between landing pages come from layout, typography, motion, and composition — NOT from hardcoded colors.

### 6. No fractional-opacity on foreground

Patterns like `bg-foreground/[0.06]`, `text-foreground/[0.4]`, `border-foreground/[0.08]` are old-template tells. They come from trying to make muted variants by taking the foreground and reducing its opacity. Don't — the theme already has semantic tokens for this: `bg-muted`, `text-muted-foreground`, `border-border`, `bg-card`. Use them.

> **Scaffold audit for rules #5 + #6.** The scaffolded `.deepspace/features/landing/src/LandingPage.tsx` and `primitives.tsx` ship with `bg-foreground/[0.06]`, `border-foreground/[0.08]`, hardcoded `bg-emerald-400`, and a `rgba(139, 92, 246, 0.5)` conic gradient inside `GlassCard`, `PlaceholderImage`, `BrowserMockup`, `SectionHeading`, and the page shell. If you install the `landing` feature and reuse its primitives/sections, the grep gate WILL flag hits *inside the scaffold*. They're bugs to fix in your app's scaffolded copy, not false positives — every flagged line has a semantic-token replacement. The patterns in `pattern-library.md` and the files in `landing-design/examples/` are grep-clean; they primarily use the scaffold's clean primitives (`ScrollReveal`, `StaggerContainer`, `AnimatedStat`, `Typewriter`) and build card/image surfaces inline with semantic tokens.

### 7. Pick a font that's clear, elegant, and fits the product — never gimmicky

Reason about the product's tone first, then pick a font that serves it. **Clarity and elegance always beat distinctiveness for distinctiveness' sake.** Inter, Montserrat, DM Sans, Manrope are valid headline picks when the product needs clarity over personality — they are deliberate choices, not defaults. Fraunces, Playfair Display, Cormorant, EB Garamond, Spectral for editorial / warm / premium. JetBrains Mono, IBM Plex Mono, Space Mono, IBM Plex Sans for technical / dev.

**Avoid display fonts that read as costume:** Syne, Bebas Neue, Anton, Fjalla One, Oswald, Impact, Josefin Sans, Pacifico, Lobster. They feel theatrical, not designed.

The test: would a thoughtful designer ship this font for THIS product? If the answer requires a paragraph of justification, pick something simpler. See `style-tile.md` for the full reasoning workflow and pairings table.

### 8. Product mockups must be React components, not AI images

AI image models render UI as garbled gibberish — fake buttons, broken text, non-existent charts. Any product screenshot you "generate" will look obviously fake. Build product mockups as React components: inline SVG for icons, styled divs for cards, Framer Motion for transitions. This is the #1 lever for making a landing page look real.

### 9. Every AI-generated image prompt must include `no text, no words, no letters, no writing, no logos`

Even for abstract atmospheric images, AI models hallucinate text. Always include the negative clause. If you forget it, the image will have fake gibberish text on a sign or a screen, and the whole page will look AI-made.

Use DeepSpace's image-generation integrations via `integration.post(...)` — e.g. `freepik/generate-image-flux-dev`, `gemini/generate-image`, `openai/generate-image`. See `references/integrations.md` and the per-integration YAML files for body shapes. Store the generated URL (or the uploaded asset via `useR2Files`) and pass it to your hero/background component.

### 10. Dramatic type scale

Headlines should be at least 3× the size of body text. Linear's hero is 72px over 18px body — 4×. If your headline is 32px and your body is 16px (2×), the page looks flat. Push the contrast.

### 11. One commanding visual in the hero

The hero must have ONE thing that is unambiguously the centerpiece. Could be an animated React mockup, a full-bleed atmospheric background, a bold gradient environment, a signature element like a breath circle or a terminal. If the hero is "centered text on a flat background," the page is already failing before it loads.

### 12. Never clone a reference verbatim (scaffold OR examples)

Two failure modes, same root cause — the agent skipped the Direction-first workflow and reached for a nearby template:

1. **Shipping the scaffolded `landing` feature with copy swapped in.** Treat the scaffolded sections (hero, features, testimonials, FAQ, CTA, footer) as a skeleton, not a finished page. Shipping them with placeholder copy swapped in reproduces the "Your DeepSpace app is running" failure mode — template, not product.
2. **Copy-pasting from `landing-design/examples/`.** The four example files are read-only teaching artifacts — they exist so you can learn how a direction becomes code, not so you can clone a file. The grep gate catches illegal imports. If you find yourself wanting to import from examples, stop — what you actually want is to pick a snippet from `pattern-library.md` and adapt it.

### 13. Animations must respect `prefers-reduced-motion`

Parallax, infinite marquees, and scaling animations can trigger vertigo and nausea in users with vestibular disorders. Three cases need manual gating:

- **`useTransform` from `useScroll`** (parallax, pinned scroll). MotionValues bypass `MotionConfig`. Short-circuit the output: `const reduce = useReducedMotion(); const bgY = useTransform(progress, [0,1], reduce ? ['0%','0%'] : ['0%','50%'])`.
- **Continuous loops** (`setInterval`/`setTimeout`/`requestAnimationFrame`). Skip the loop or jump to the end state.
- **CSS keyframe animations.** Add `@media (prefers-reduced-motion: reduce) { animation: none; }`.

If you wrap the landing tree in `<MotionConfig reducedMotion="user">`, framer-motion's transform/layout animations auto-disable; you still need to handle the three cases above manually.

### 14. No pictograph emojis in JSX

Emojis render inconsistently across platforms (Apple is rounded and colorful, Google is flat, Microsoft is angular), can't inherit your theme color, look chunky next to clean typography, and are the #1 reflex AI agents reach for as "decoration." Every AI landing page has 🚀 next to "Get started" and ✨ next to "Now with AI" — stop using them and your page reads as human-crafted.

**Use instead:**

- **`lucide-react` icons** for interface symbols — already a dependency, inherit `currentColor`, ~1000 icons cover almost everything you'd reach for an emoji for. `<ArrowRight />`, `<Check />`, `<Sparkles />`, `<Zap />`, `<Star />`, `<Heart />`.
- **Inline SVG** for distinctive marks — section dividers, signature elements, background patterns. Build as React components.
- **Plain typographic marks** as text characters: `✓ ✗ → ← ↑ ↓ ★ ☆ — – ·`. These render as text in your font, not pictures.

The grep gate catches the modern emoji range (Unicode 1F000–1FFFF). A handful of legacy BMP codepoints (☀️ ⭐ ✨) slip through and need eyeball review.

## The grep gate — run before finishing

From the app root (e.g., `cd ~/Desktop/Work/<app-name>`), scope to landing files:

```bash
# ── Hardcoded colors — should never appear ───────────────────────────────────
grep -rnE "#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null
grep -rnE "rgba?\([0-9]" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null
grep -rnE "\b(violet|indigo|purple|fuchsia|rose|amber|emerald|teal|cyan|sky|blue|green|red|orange|yellow|lime|pink)-[0-9]{3}" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null

# ── Fractional-opacity foreground patterns ───────────────────────────────────
grep -rnE "(bg|text|border)-foreground/\[?0" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null

# ── Continuous animations — advisory; review each for a useReducedMotion gate
grep -rnE "repeat:\s*Infinity|setInterval\(|requestAnimationFrame\(" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null

# ── Pictograph emojis (Unicode 1F000-1FFFF). Plain marks like ✓ ✗ → ★ are NOT
# caught (they're in the BMP < 1F000) and are allowed as text glyphs.
# Needs PCRE: use `rg "[\u{1F000}-\u{1FFFF}]" src/pages/landing.tsx src/components/landing/` if `grep -P` is unavailable.
grep -rnP "[\x{1F000}-\x{1FFFF}]" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null

# ── Template placeholder copy + generic marketing phrases ────────────────────
grep -rniE "My App|Welcome to [Mm]y|[Ll]orem [Ii]psum|Your DeepSpace app is running" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null
grep -rniE "streamline your|transform your|cutting.edge|state.of.the.art|next.generation|revolutionary|world.class|best.in.class|game.chang" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null

# ── Unfilled TODOs ───────────────────────────────────────────────────────────
grep -rnE "TODO[: ]" --include="*.tsx" src/pages/landing.tsx src/components/landing/ 2>/dev/null

# ── Illegal import from landing-design/examples/ (read-only reference) ──────
grep -rn "from.*landing-design/examples" --include="*.tsx" src/ 2>/dev/null
```

**Any hit is a bug to fix before shipping.** If the grep gate is clean but you're still unsure, run the eyeball checks:

- [ ] Design Direction block (prose, not placeholders) is present at the top of the landing page file
- [ ] Hero headline is 3–8 words
- [ ] Hero has a commanding visual (mockup, atmospheric bg, signature element), not just centered text
- [ ] Features section is not 3 identical cards
- [ ] Every image slot is filled (real `integration.post('freepik|openai|gemini/generate-image...')` URL, uploaded R2 asset, or a code-based React visual)
- [ ] The page doesn't look like a generic purple-gradient SaaS landing page
- [ ] The scaffolded landing sections have been replaced or substantively rewritten — not shipped as-is

If any eyeball check fails, the bug isn't in the grep gate — it's in the design. Go back to the Design Direction block and check: does the code actually serve the direction you wrote? Usually the answer is "the direction is too vague" or "I drifted from my own direction."
