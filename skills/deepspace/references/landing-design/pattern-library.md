# Pattern library — index

Copy-pasteable TSX snippets, organized by page section. Read this file as an index, then load **only the section file you need**. Each section file has 3–6 patterns and is self-contained.

## Pick your sections, then load only those files

The recipe for a landing page:

| Section | How many | Section file |
|---|---|---|
| Navigation | 1 (or 0 — some pages need none) | `pattern-library/nav.md` |
| Hero | 1 | `pattern-library/hero.md` |
| Features | 1 (sometimes 2) | `pattern-library/features.md` |
| Social proof | 0–1 (only if you have real proof) | `pattern-library/social-proof.md` |
| CTA | 1 | `pattern-library/cta.md` |
| Footer | 1 | `pattern-library/footer.md` |
| Scroll & motion | 0–N (only if your Direction calls for it) | `pattern-library/scroll-motion.md` |

The `N1`, `H1`, `F1`, `S1`, `C1`, `FT1`, `SM1` labels inside each file are stable identifiers for commit messages and notes.

**You will read maybe one or two of these files.** That is correct. Direction-first; reach for a pattern only after you've committed to a direction.

## How patterns integrate with DeepSpace

These two paragraphs apply to every pattern in every section file. Read once.

- **Primitives you can use freely** (from the scaffolded `src/components/landing/primitives.tsx`): `Typewriter`, `ScrollReveal`, `StaggerContainer`, `staggerChild`, `AnimatedStat`, plus the re-exports `cn`, `motion`, `AnimatePresence`, `useInView`, `ChevronDown`. These are semantic-token-clean.
- **Primitives that contain rule violations** (`GlassCard`, `PlaceholderImage`, `BrowserMockup`, `SectionHeading`): each ships with `bg-foreground/[0.06]`, `border-foreground/[0.08]`, or hardcoded color names that fail the grep gate. Two choices when you reach for one:
  1. **Recommended:** build the surface inline in your pattern/section with semantic tokens (`bg-card`, `border-border`, `bg-muted`) — the patterns in this library do this.
  2. Edit `primitives.tsx` directly to replace the violating lines (they all have semantic-token equivalents).
- **`markLandingSeen`** is exported from `src/pages/landing.tsx` (the scaffolded landing page), NOT from primitives. Import it as `import { markLandingSeen } from '../pages/landing'` from inside `src/components/landing/`, or inline the 2-line helper at the top of whatever file needs it:
  ```tsx
  const LANDING_SEEN_KEY = 'app-landing-seen'
  function markLandingSeen() { try { localStorage.setItem(LANDING_SEEN_KEY, 'true') } catch {} }
  ```
- **Navigation** goes to `/home` (which is **public by default** in the scaffold) via `useNavigate()` from `react-router-dom`. To force sign-in on a CTA click, point at a route under `src/pages/(protected)/` (any file there is gated by the scaffolded `(protected)/_layout.tsx`) — see SKILL.md Step 4. Sign-in itself lives in the scaffold's top-level `Navigation.tsx` (AuthOverlay).

## Universal rules

These apply to every snippet. The grep gate in `anti-ai-checklist.md` enforces them.

- Semantic tokens only (`bg-primary`, `text-foreground`, `bg-muted`, `border-border`). No hardcoded hex, `rgb()`, `oklch()`, or Tailwind color names (`violet-400`, `emerald-500`).
- No `bg-foreground/[0.XX]`, `text-foreground/[0.XX]`, `border-foreground/[0.XX]` patterns — use `bg-muted`, `bg-card`, `border-border` instead.
- Replace every `TODO: …` placeholder with product-specific copy.
- **No pictograph emojis** (🚀 ✨ 💡 etc.) — use `lucide-react` icons or inline SVG. Plain typographic marks (`✓ ✗ → ← ↑ ↓ ★`) are allowed as text glyphs.
- **Reduced motion:** wrap your landing tree in `<MotionConfig reducedMotion="user">` from `framer-motion`. `useTransform` from `useScroll`, `setInterval`/`raf` loops, and CSS keyframes still need manual `useReducedMotion()` gates — the scroll/motion file shows the pattern.

## Scaffold gotcha (read once)

The scaffolded `.deepspace/features/landing/src/LandingPage.tsx` and `primitives.tsx` ship with `bg-foreground/[0.06]`, `border-foreground/[0.08]`, hardcoded `bg-emerald-400`, and a violet conic gradient. If you install the `landing` feature and run the grep gate, expect hits **inside the scaffold itself**. Clean them up before shipping — every flagged line has a semantic-token equivalent (`bg-muted`, `border-border`, `bg-primary`, etc.).

## After you compose

Run the grep gate from `anti-ai-checklist.md` before finishing. Any hit is a bug. Then eyeball-check that the page actually serves the Design Direction you wrote — if it doesn't, the bug isn't in a pattern, it's in your direction commitment.
