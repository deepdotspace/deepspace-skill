# Pattern Library

Copy-pasteable TSX snippets organized by page section. Read this *after* you've filled your Design Direction — direction first, patterns second. Pick 1 nav, 1 hero, 1–2 features, 0–1 social proof, 1 CTA, 1 footer, 0–N scroll/motion. Adapt each to serve your direction.

## How to read this file

**Sections:** Navigation (6) · Hero (5) · Features (5) · Social Proof (4) · CTA (3) · Footer (3) · Scroll & Motion (4) — 30 patterns total.

**You will read less than 20% of this file. That is correct.** For each section: skim the "when to use" lines under the `##` header, pick ONE pattern that fits your Direction, read just that one's code, move on.

**Every section is a starting point, not a requirement.** If your product needs an FAQ, a pricing table, a newsletter form, or anything else not here, design it yourself. Don't wait for a pattern. Scroll & Motion is the most context-dependent section — skip it entirely unless your Direction calls for scroll choreography.

The `N1`, `H1`, `F1`, `S1`, `C1`, `FT1`, `SM1` labels are stable identifiers for commit messages and notes.

## How patterns integrate with DeepSpace

- **Primitives you can use freely** (from the scaffolded `src/components/landing/primitives.tsx`): `Typewriter`, `ScrollReveal`, `StaggerContainer`, `staggerChild`, `AnimatedStat`, plus the re-exports `cn`, `motion`, `AnimatePresence`, `useInView`, `ChevronDown`. These are semantic-token-clean.
- **Primitives that contain rule violations** (`GlassCard`, `PlaceholderImage`, `BrowserMockup`, `SectionHeading`): each ships with `bg-foreground/[0.06]`, `border-foreground/[0.08]`, or hardcoded color names that fail the grep gate. Two choices when you reach for one:
  1. **Recommended:** build the surface inline in your pattern/section with semantic tokens (`bg-card`, `border-border`, `bg-muted`) — the patterns below do this.
  2. Edit `primitives.tsx` directly to replace the violating lines (they all have `bg-muted` / `border-border` / `bg-card` equivalents).
- **`markLandingSeen`** is exported from `src/pages/landing.tsx` (the scaffolded landing page), NOT from primitives. Import it as `import { markLandingSeen } from '../pages/landing'` from inside `src/components/landing/`, or inline the 2-line helper at the top of whatever file needs it:
  ```tsx
  const LANDING_SEEN_KEY = 'app-landing-seen'
  function markLandingSeen() { try { localStorage.setItem(LANDING_SEEN_KEY, 'true') } catch {} }
  ```
- **Navigation** goes to `/home` (the scaffolded authenticated home) via `useNavigate()` from `react-router-dom`. Sign-in lives in the scaffold's top-level `Navigation.tsx` (AuthOverlay) — landing-page CTAs just call `markLandingSeen()` and navigate; auth state is handled at the shell level.

## Rules

- Semantic tokens only (`bg-primary`, `text-foreground`, `bg-muted`, `border-border`). No hardcoded hex, `rgb()`, or Tailwind color names (`violet-400`, `emerald-500`). Radical visual differences come from layout + typography + motion, not color values.
- No `bg-foreground/[0.XX]`, `text-foreground/[0.XX]`, `border-foreground/[0.XX]` patterns — use `bg-muted`, `bg-card`, `border-border` instead.
- Generic `TODO: …` content MUST be replaced with product-specific copy.
- **No pictograph emojis** (🚀 ✨ 💡 🎉 ⭐ 🔥 etc.) — use `lucide-react` icons or inline SVG. Plain typographic marks (`✓ ✗ → ← ↑ ↓ ★`) are allowed as text glyphs. See `landing-design.md` rule #14.
- **Reduced motion:** wrap your landing page tree in `<MotionConfig reducedMotion="user">` from `framer-motion`. Framer-motion components then auto-disable transform/layout animations. `useTransform` from `useScroll`, `setInterval`/`raf` loops, and CSS keyframes need manual `useReducedMotion()` gates — see SM1 and SM2.

---

## Navigation patterns

### N1 — Dual-state floating pill (RECOMMENDED for SaaS / consumer products)

When to use: most modern SaaS, productivity tools, consumer products. The default workhorse — pick this unless your direction calls for something specific. Three coordinated pieces: a static top nav at page top, a floating pill that materializes on scroll, and an animated mobile dropdown. Active section highlighting works in both desktop states.

```tsx
import { useEffect, useState, useRef, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import {
  AnimatePresence,
  motion,
  cn,
} from '../components/landing/primitives'
import { markLandingSeen } from '../pages/landing'

const NAV_SECTIONS = [
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
] as const

const APP_NAME = 'TODO: Brand'

// Small inline useActiveSection — the scaffolded one in LandingPage.tsx
// is not exported, and copying it here keeps patterns self-contained.
function useActiveSection(ids: readonly string[], scrollRoot: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const root = scrollRoot.current
    if (!root) return
    const calc = () => {
      const triggerY = root.getBoundingClientRect().top + root.getBoundingClientRect().height * 0.3
      let cur: string | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= triggerY) cur = id
      }
      setActive(cur)
    }
    calc()
    root.addEventListener('scroll', calc, { passive: true })
    return () => root.removeEventListener('scroll', calc)
  }, [ids, scrollRoot])
  return active
}

export function LandingNav({ scrollRootRef }: { scrollRootRef: RefObject<HTMLDivElement | null> }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const ids = NAV_SECTIONS.map(s => s.id)
  const active = useActiveSection(ids, scrollRootRef)

  useEffect(() => {
    const el = scrollRootRef.current
    if (!el) return
    const onScroll = () => setIsScrolled(el.scrollTop > 80)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollRootRef])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    const target = document.getElementById(id)
    const root = scrollRootRef.current
    if (!target || !root) return
    const top = target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
    root.scrollTo({ top, behavior: 'smooth' })
  }

  const enterApp = () => { markLandingSeen(); navigate('/home') }

  const mobileDropdown = (
    <AnimatePresence>
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="md:hidden mt-2 rounded-2xl overflow-hidden bg-card/95 backdrop-blur-xl border border-border shadow-lg"
        >
          <div className="p-2 flex flex-col gap-0.5">
            {NAV_SECTIONS.map(link => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-colors',
                  active === link.id
                    ? 'text-foreground bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                )}
              >
                {link.label}
              </button>
            ))}
            <div className="h-px bg-border my-1" />
            <button onClick={enterApp} className="px-4 py-2.5 rounded-xl text-sm font-medium text-left text-primary hover:bg-muted/70">
              Get Started
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {/* Static top nav (page top; fades out on scroll) */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-50"
        animate={{ opacity: isScrolled ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        style={{ pointerEvents: isScrolled ? 'none' : 'auto' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="font-semibold text-lg tracking-tight text-foreground">{APP_NAME}</span>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-8">
              {NAV_SECTIONS.map(link => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    active === link.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {link.label}
                </button>
              ))}
            </div>
            <button
              onClick={enterApp}
              className="hidden md:inline-flex items-center px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started
            </button>
            <button
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(p => !p)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6">{mobileDropdown}</div>
      </motion.div>

      {/* Floating pill (slides down on scroll) */}
      <AnimatePresence>
        {isScrolled && (
          <motion.nav
            className="fixed top-4 inset-x-0 z-50 flex justify-center pointer-events-none"
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <div className="pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-full bg-background/80 backdrop-blur-2xl border border-border shadow-lg">
              <span className="text-foreground font-semibold text-sm px-3 whitespace-nowrap">{APP_NAME}</span>
              <div className="w-px h-4 bg-border mx-1 hidden md:block" />
              <div className="hidden md:flex items-center gap-0.5">
                {NAV_SECTIONS.map(link => (
                  <button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors',
                      active === link.id
                        ? 'text-foreground bg-muted'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                    )}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
              <button
                onClick={enterApp}
                className="ml-1 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Get Started
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}
```

**Direction → choice:** The "pill materializes on scroll" pattern reads as polish-conscious and modern. If your direction is editorial/zine (no polish theater) or brutalism (rejects smooth transitions), pick N5 or N3 instead.

---

### N2 — Sticky docs-style top bar

When to use: dev tools, doc-heavy products, anything where the nav needs to persist and feel functional rather than decorative. No transformation on scroll — just a solid bar that stays put.

```tsx
import { useNavigate } from 'react-router-dom'
import { motion } from '../components/landing/primitives'
import { markLandingSeen } from '../pages/landing'

const NAV = [
  { label: 'Docs', href: '/docs' },
  { label: 'Changelog', href: '#changelog' },
  { label: 'GitHub', href: 'https://github.com/TODO' },
]

export function DocsTopBar() {
  const navigate = useNavigate()
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">TODO: brand</span>
          <nav className="hidden md:flex items-center gap-6">
            {NAV.map(l => (
              <a key={l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <button
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          Launch app →
        </button>
      </div>
    </motion.header>
  )
}
```

---

### N3 — CRT title card (no nav at all)

When to use: manifesto sites, single-screen kinetic-typography landings, retro/Y2K directions. When the page is so committed to a single idea that a nav would diminish it.

```tsx
import { useNavigate } from 'react-router-dom'
import { motion } from '../components/landing/primitives'
import { markLandingSeen } from '../pages/landing'

export function NoNavCornerBrand() {
  const navigate = useNavigate()
  return (
    <>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="fixed top-6 left-6 z-50 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground"
      >
        TODO: brand
      </motion.span>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        onClick={() => { markLandingSeen(); navigate('/home') }}
        className="fixed top-6 right-6 z-50 font-mono text-xs uppercase tracking-[0.3em] text-primary hover:opacity-70"
      >
        Enter →
      </motion.button>
    </>
  )
}
```

---

### N4 — Hamburger-only (mobile-first minimal)

When to use: consumer products with strong identity where the nav is a secondary concern. The brand logo is the experience; menu is behind a button on every device.

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { AnimatePresence, motion, cn } from '../components/landing/primitives'
import { markLandingSeen } from '../pages/landing'

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'FAQ', href: '#faq' },
]

export function HamburgerNav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <>
      <div className="fixed top-5 left-5 z-50">
        <span className="text-base font-semibold text-foreground">TODO: brand</span>
      </div>
      <button
        onClick={() => setOpen(p => !p)}
        className="fixed top-4 right-4 z-50 w-11 h-11 grid place-items-center rounded-full bg-background border border-border shadow-sm"
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl grid place-items-center"
          >
            <ul className="space-y-6 text-center">
              {LINKS.map((l, i) => (
                <motion.li
                  key={l.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="text-3xl font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {l.label}
                  </a>
                </motion.li>
              ))}
              <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                <button
                  onClick={() => { markLandingSeen(); navigate('/home') }}
                  className="mt-6 inline-flex items-center px-6 py-3 rounded-full bg-primary text-primary-foreground text-base font-medium"
                >
                  Enter the app →
                </button>
              </motion.li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}
```

---

### N5 — Inline anchor list (editorial)

When to use: editorial, magazine, zine-style, or single-page long-scroll pages where the nav is prose-adjacent. No fixed bar, no pill — just a small horizontal index at the top that scrolls with the page.

```tsx
import { useNavigate } from 'react-router-dom'
import { markLandingSeen } from '../pages/landing'

const SECTIONS = [
  { id: 'issue', label: 'This issue' },
  { id: 'notes', label: 'Editor\u2019s notes' },
  { id: 'archive', label: 'Archive' },
]

export function EditorialIndex() {
  const navigate = useNavigate()
  return (
    <header className="max-w-5xl mx-auto px-6 pt-8 pb-10">
      <div className="flex items-baseline justify-between border-b-2 border-foreground pb-3">
        <span className="font-serif text-xl italic text-foreground">TODO: masthead</span>
        <span className="hidden sm:block font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Issue №01 · TODO: date
        </span>
      </div>
      <nav className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`} className="hover:text-foreground">
            {s.label}
          </a>
        ))}
        <span className="flex-1" />
        <button
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="text-primary hover:opacity-70"
        >
          Enter →
        </button>
      </nav>
    </header>
  )
}
```

---

### N6 — Hover-panel mega menu (Vercel / Stripe style)

When to use: product suites or platforms with enough surface area that a single flat nav wouldn't fit. Each top-level item opens a categorized panel on hover.

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion, cn } from '../components/landing/primitives'
import { markLandingSeen } from '../pages/landing'

const MENU = {
  Product: [
    { label: 'Dashboard', desc: 'See everything at a glance.' },
    { label: 'Automations', desc: 'Rules that run quietly in the background.' },
    { label: 'Integrations', desc: 'Wire in the tools you already use.' },
  ],
  Resources: [
    { label: 'Docs', desc: 'Reference + API.' },
    { label: 'Changelog', desc: 'What we shipped.' },
    { label: 'Community', desc: 'Ask, answer, lurk.' },
  ],
} as const

export function MegaMenuNav() {
  const [open, setOpen] = useState<keyof typeof MENU | null>(null)
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <span className="font-semibold text-foreground">TODO: brand</span>
        <nav className="hidden md:flex items-center gap-6" onMouseLeave={() => setOpen(null)}>
          {(Object.keys(MENU) as (keyof typeof MENU)[]).map(key => (
            <div key={key} className="relative" onMouseEnter={() => setOpen(key)}>
              <button
                className={cn(
                  'flex items-center gap-1 text-sm font-medium transition-colors',
                  open === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {key}
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open === key && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {open === key && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 rounded-2xl bg-card border border-border shadow-xl p-3"
                  >
                    <ul className="flex flex-col">
                      {MENU[key].map(item => (
                        <li key={item.label}>
                          <a href="#" className="flex flex-col gap-0.5 p-3 rounded-lg hover:bg-muted transition-colors">
                            <span className="text-sm font-medium text-foreground">{item.label}</span>
                            <span className="text-xs text-muted-foreground">{item.desc}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>
        <button
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          Launch →
        </button>
      </div>
    </header>
  )
}
```

**Direction → choice:** Only pick N6 if the product actually has 2+ top-level categories. A two-page product using a mega menu looks bigger than it is and reads as try-hard.

---

## Hero patterns

### H1 — Split-screen with animated product mockup

When to use: product-led SaaS where a UI preview is the easiest way to explain the thing. Text on one side, a live-rendered React mockup on the other. The mockup should be a React component — never an AI-generated image.

```tsx
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion } from '../components/landing/primitives'
import { markLandingSeen } from '../pages/landing'

// Inline product mockup — replace with your own shape.
function AppMockup() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted">
        <span className="w-2.5 h-2.5 rounded-full bg-border" />
        <span className="w-2.5 h-2.5 rounded-full bg-border" />
        <span className="w-2.5 h-2.5 rounded-full bg-border" />
      </div>
      <div className="p-5 grid grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i, duration: 0.4 }}
            className="aspect-[4/3] rounded-lg bg-muted border border-border grid place-items-center"
          >
            <div className="w-8 h-8 rounded-full bg-primary/30" />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function SplitHero() {
  const navigate = useNavigate()
  return (
    <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-6xl font-bold tracking-[-0.02em] leading-[1.05] text-foreground"
        >
          TODO: 3–8 word headline.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed"
        >
          TODO: one sentence of product-specific context. No marketing clichés.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-8"
        >
          <button
            onClick={() => { markLandingSeen(); navigate('/home') }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium group"
          >
            Start free
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
        <AppMockup />
      </motion.div>
    </section>
  )
}
```

---

### H2 — Full-bleed atmospheric

When to use: consumer brands, lifestyle/editorial products, products whose value is mood more than feature. A generated atmospheric image fills the viewport; the headline floats over a gradient.

**Generate the image with** `integration.post('freepik/generate-image-flux-dev', ...)` (or `gemini/generate-image`, `openai/generate-image`). **Your prompt MUST include `no text, no words, no letters, no writing, no logos`** — AI models hallucinate gibberish text otherwise. Persist the URL with `useR2Files` if you want it stable across renders.

```tsx
import { useNavigate } from 'react-router-dom'
import { motion } from '../components/landing/primitives'
import { markLandingSeen } from '../pages/landing'

const HERO_BG = 'TODO: paste integration-generated image URL here'

export function AtmosphericHero() {
  const navigate = useNavigate()
  return (
    <section className="relative min-h-[90vh] overflow-hidden">
      <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-36 pb-24 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl font-serif italic text-foreground leading-[1.02]"
        >
          TODO: 3–8 word headline.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-6 text-lg text-foreground/85 max-w-xl mx-auto"
        >
          TODO: one sentence.
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="mt-10 inline-flex items-center px-7 py-3.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90"
        >
          Enter →
        </motion.button>
      </div>
    </section>
  )
}
```

---

### H3 — Bento hero

When to use: multi-feature SaaS where the first viewport should already communicate 3–5 things. Headline top-left; supporting tiles fill the rest of the bento grid. Each tile is a small, distinct visual — not three identical cards.

```tsx
import { useNavigate } from 'react-router-dom'
import { motion } from '../components/landing/primitives'
import { markLandingSeen } from '../pages/landing'

export function BentoHero() {
  const navigate = useNavigate()
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
      <div className="grid grid-cols-6 auto-rows-[minmax(160px,_auto)] gap-3 md:gap-4">
        {/* Headline tile (spans 4 cols × 2 rows) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="col-span-6 md:col-span-4 md:row-span-2 rounded-3xl bg-card border border-border p-8 flex flex-col justify-between"
        >
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">TODO: tagline</span>
          <div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.02em] leading-[1.04] text-foreground">
              TODO: 3–8 word headline.
            </h1>
            <button
              onClick={() => { markLandingSeen(); navigate('/home') }}
              className="mt-8 inline-flex items-center px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium"
            >
              Get started →
            </button>
          </div>
        </motion.div>

        {/* Stat tile */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-3 md:col-span-2 rounded-3xl bg-primary text-primary-foreground p-6 flex flex-col justify-end"
        >
          <span className="text-5xl font-bold tracking-tight">TODO</span>
          <span className="text-xs uppercase tracking-[0.2em] opacity-80 mt-1">TODO: metric</span>
        </motion.div>

        {/* Illustration tile */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-3 md:col-span-2 rounded-3xl bg-muted p-6 grid place-items-center"
        >
          {/* Replace with a product-specific inline visual (SVG or styled divs). */}
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-sm bg-primary/25" />
            ))}
          </div>
        </motion.div>

        {/* Quote tile */}
        <motion.blockquote
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-6 md:col-span-3 rounded-3xl bg-card border border-border p-6"
        >
          <p className="font-serif italic text-lg text-foreground leading-snug">
            &ldquo;TODO: pull quote that actually sounds like a person said it.&rdquo;
          </p>
          <cite className="block mt-3 not-italic text-xs font-mono uppercase tracking-wider text-muted-foreground">
            — TODO: real name, real title
          </cite>
        </motion.blockquote>

        {/* Info tile */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-6 md:col-span-3 rounded-3xl bg-foreground text-background p-6 flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.25em] opacity-70">TODO: label</span>
            <p className="mt-1 text-lg font-medium">TODO: terse benefit.</p>
          </div>
          <span className="text-2xl">→</span>
        </motion.div>
      </div>
    </section>
  )
}
```

---

### H4 — Typographic poster

When to use: manifesto sites, writing products, agencies. The headline IS the hero — oversized type on a near-empty canvas, one accent color.

```tsx
import { useNavigate } from 'react-router-dom'
import { motion } from '../components/landing/primitives'
import { markLandingSeen } from '../pages/landing'

export function PosterHero() {
  const navigate = useNavigate()
  return (
    <section className="min-h-[80vh] flex items-center">
      <div className="max-w-6xl mx-auto px-6 w-full">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="font-serif text-[12vw] leading-[0.9] tracking-[-0.04em] text-foreground"
        >
          TODO: first <span className="italic text-primary">bold</span> claim.
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex items-end justify-between gap-6 border-t-2 border-foreground pt-4"
        >
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            TODO: one short supporting sentence — 12 words or under.
          </p>
          <button
            onClick={() => { markLandingSeen(); navigate('/home') }}
            className="font-mono text-xs uppercase tracking-[0.25em] text-primary hover:opacity-70"
          >
            Begin →
          </button>
        </motion.div>
      </div>
    </section>
  )
}
```

---

### H5 — Live terminal / CLI demo

When to use: dev tools, APIs, technical infrastructure. A fake terminal types commands with realistic variable timing. Wrap outside output so it reads as convincing, not scripted.

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { markLandingSeen } from '../pages/landing'

const SCRIPT: Array<{ type: 'in' | 'out'; text: string; pauseAfter?: number }> = [
  { type: 'in', text: '$ TODO install your-cli', pauseAfter: 400 },
  { type: 'out', text: '  ✓ fetched 42 packages in 1.4s' },
  { type: 'in', text: '$ TODO run --live', pauseAfter: 300 },
  { type: 'out', text: '  ▸ watching ./src …' },
  { type: 'out', text: '  ▸ 14 routes · 3 workers · ready on :5173' },
]

export function TerminalHero() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)

  useEffect(() => {
    if (reduce) { setLineIdx(SCRIPT.length); return }
    if (lineIdx >= SCRIPT.length) return
    const line = SCRIPT[lineIdx]
    if (charIdx >= line.text.length) {
      const t = setTimeout(() => { setLineIdx(i => i + 1); setCharIdx(0) }, line.pauseAfter ?? 120)
      return () => clearTimeout(t)
    }
    const delay = line.type === 'out' ? 6 : 22 + Math.random() * 26
    const t = setTimeout(() => setCharIdx(c => c + 1), delay)
    return () => clearTimeout(t)
  }, [lineIdx, charIdx, reduce])

  const visible = SCRIPT.slice(0, lineIdx + 1)

  return (
    <section className="max-w-5xl mx-auto px-6 py-24 grid md:grid-cols-[1fr_1.3fr] gap-10 items-center">
      <div>
        <h1 className="font-mono text-4xl md:text-5xl font-bold text-foreground leading-[1.08] tracking-[-0.02em]">
          TODO: 3–8 word headline.
        </h1>
        <p className="mt-5 text-muted-foreground max-w-md">
          TODO: one line.
        </p>
        <button
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="mt-8 inline-flex items-center px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Try it →
        </button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card overflow-hidden shadow-xl font-mono text-sm"
      >
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="ml-3 text-[11px] text-muted-foreground">bash</span>
        </div>
        <div className="p-4 min-h-[240px] leading-relaxed">
          {visible.map((line, i) => {
            const shown = i === lineIdx ? line.text.slice(0, charIdx) : line.text
            return (
              <div key={i} className={line.type === 'in' ? 'text-foreground' : 'text-primary'}>
                {shown}
                {i === lineIdx && !reduce && <span className="inline-block w-2 h-4 align-middle bg-foreground ml-0.5 animate-pulse" />}
              </div>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}
```

**Reduced-motion note:** the `reduce` short-circuit jumps the terminal to its end state. The `setTimeout` loop is not framer-motion so `MotionConfig` doesn't cover it — manual gating required (see rule #13 in `anti-ai-checklist.md`).

---

## Features patterns

Three identical cards with Icon + Title + Description is the #1 AI-generated layout tell. Every pattern below is designed to break that shape.

### F1 — Tabbed interactive showcase

When to use: 3–5 features, each of which needs a visual. One tab list, one preview area. Clicking a tab swaps the preview.

```tsx
import { useState } from 'react'
import { motion, AnimatePresence, cn } from '../components/landing/primitives'

const FEATURES = [
  { id: 'speed', label: 'Speed', title: 'TODO headline.', body: 'TODO one sentence.' },
  { id: 'sync', label: 'Sync', title: 'TODO headline.', body: 'TODO one sentence.' },
  { id: 'share', label: 'Share', title: 'TODO headline.', body: 'TODO one sentence.' },
]

export function TabbedFeatures() {
  const [active, setActive] = useState(FEATURES[0].id)
  const feature = FEATURES.find(f => f.id === active)!
  return (
    <section id="features" className="max-w-5xl mx-auto px-6 py-24">
      <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-[-0.02em]">
        TODO: section headline.
      </h2>
      <div className="mt-10 grid md:grid-cols-[220px_1fr] gap-8">
        <ul className="flex md:flex-col gap-1 border-b md:border-b-0 md:border-r border-border md:pr-6">
          {FEATURES.map(f => (
            <li key={f.id}>
              <button
                onClick={() => setActive(f.id)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  active === f.id
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
        <AnimatePresence mode="wait">
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border bg-card p-8 min-h-[260px]"
          >
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">{feature.label}</span>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">{feature.title}</h3>
            <p className="mt-3 text-muted-foreground max-w-md">{feature.body}</p>
            {/* Add a feature-specific inline visual here — styled divs, SVG, not AI images. */}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
```

---

### F2 — Alternating visual rows

When to use: 2–4 features where each deserves space. Rows alternate left/right so the page has rhythm.

```tsx
import { ScrollReveal } from '../components/landing/primitives'

const ROWS = [
  { label: 'TODO', title: 'TODO headline.', body: 'TODO copy.', flip: false },
  { label: 'TODO', title: 'TODO headline.', body: 'TODO copy.', flip: true },
]

export function AlternatingRows() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-28 space-y-24">
      {ROWS.map((row, i) => (
        <div
          key={i}
          className={`flex flex-col ${row.flip ? 'md:flex-row-reverse' : 'md:flex-row'} gap-10 md:gap-16 items-center`}
        >
          <ScrollReveal direction={row.flip ? 'right' : 'left'} className="flex-1 w-full">
            {/* Replace with a feature-specific inline visual. */}
            <div className="aspect-video rounded-2xl bg-muted border border-border" />
          </ScrollReveal>
          <ScrollReveal direction={row.flip ? 'left' : 'right'} delay={0.1} className="flex-1 max-w-md">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">{row.label}</span>
            <h3 className="mt-2 text-3xl font-semibold text-foreground tracking-[-0.01em]">{row.title}</h3>
            <p className="mt-4 text-muted-foreground leading-relaxed">{row.body}</p>
          </ScrollReveal>
        </div>
      ))}
    </section>
  )
}
```

---

### F3 — Bento feature grid

When to use: 4–7 features, several of which fit in smaller tiles. Size = hierarchy. The largest tile is the primary feature.

```tsx
import { ScrollReveal, cn } from '../components/landing/primitives'

const TILES = [
  { span: 'col-span-6 md:col-span-4 md:row-span-2', title: 'TODO primary.', body: 'TODO body.' },
  { span: 'col-span-3 md:col-span-2', title: 'TODO b.', body: 'TODO body.' },
  { span: 'col-span-3 md:col-span-2', title: 'TODO c.', body: 'TODO body.' },
  { span: 'col-span-6 md:col-span-2', title: 'TODO d.', body: 'TODO body.' },
  { span: 'col-span-6 md:col-span-2', title: 'TODO e.', body: 'TODO body.' },
]

export function BentoFeatures() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-24">
      <ScrollReveal className="mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-[-0.02em]">
          TODO: section headline.
        </h2>
      </ScrollReveal>
      <div className="grid grid-cols-6 auto-rows-[minmax(140px,_auto)] gap-3 md:gap-4">
        {TILES.map((t, i) => (
          <ScrollReveal key={i} delay={0.05 * i} className={cn(t.span)}>
            <div className="h-full rounded-2xl bg-card border border-border p-6 flex flex-col justify-end">
              <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.body}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
```

---

### F4 — Single scrolling showcase

When to use: one feature is so much more important than the rest that it deserves the whole section. Long-form, editorial, one visual + a few supporting beats.

```tsx
import { ScrollReveal } from '../components/landing/primitives'

export function SingleShowcase() {
  return (
    <section id="features" className="max-w-4xl mx-auto px-6 py-28">
      <ScrollReveal>
        <span className="text-xs font-mono uppercase tracking-[0.25em] text-primary">TODO: label</span>
        <h2 className="mt-3 text-4xl md:text-5xl font-semibold tracking-[-0.02em] text-foreground">
          TODO: one-sentence feature claim.
        </h2>
      </ScrollReveal>
      <ScrollReveal delay={0.15} className="mt-10">
        {/* Replace with an inline React visual that demonstrates the feature. */}
        <div className="aspect-[16/9] rounded-2xl bg-muted border border-border" />
      </ScrollReveal>
      <ScrollReveal delay={0.25} className="mt-12 grid md:grid-cols-3 gap-8">
        {[
          { h: 'TODO: beat 1', b: 'TODO one sentence.' },
          { h: 'TODO: beat 2', b: 'TODO one sentence.' },
          { h: 'TODO: beat 3', b: 'TODO one sentence.' },
        ].map(({ h, b }) => (
          <div key={h}>
            <h3 className="text-base font-semibold text-foreground">{h}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{b}</p>
          </div>
        ))}
      </ScrollReveal>
    </section>
  )
}
```

**Direction → choice:** F4 suits editorial, minimalist, and premium directions where restraint is the aesthetic. Avoid if your Direction calls for "show the whole product at a glance" — use F3 instead.

---

### F5 — Code-block feature list

When to use: dev tools where each feature is a code snippet. Title + description on one side, code sample on the other. The code IS the demo.

```tsx
import { ScrollReveal } from '../components/landing/primitives'

const CODE = [
  {
    label: 'TODO',
    title: 'TODO headline.',
    body: 'TODO one-sentence claim.',
    code: `const x = TODO()\nawait x.run()`,
  },
  {
    label: 'TODO',
    title: 'TODO headline.',
    body: 'TODO one-sentence claim.',
    code: `client.on('event', handler)\nclient.emit('event', payload)`,
  },
]

export function CodeFeatures() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-24 space-y-20">
      {CODE.map((row, i) => (
        <ScrollReveal key={i} className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">{row.label}</span>
            <h3 className="mt-2 text-2xl md:text-3xl font-semibold text-foreground">{row.title}</h3>
            <p className="mt-3 text-muted-foreground">{row.body}</p>
          </div>
          <pre className="rounded-xl border border-border bg-card p-5 overflow-x-auto text-sm font-mono text-foreground leading-relaxed">
            <code>{row.code}</code>
          </pre>
        </ScrollReveal>
      ))}
    </section>
  )
}
```

---

## Social proof patterns

Only include social proof if you actually have it. Fake logos and fake testimonials are worse than no social proof at all.

### S1 — Logo row + single big stat

When to use: you have a few real customer/user logos AND one memorable metric. Keep it spare — five logos max, one number.

```tsx
import { ScrollReveal } from '../components/landing/primitives'

const LOGOS = ['TODO-A', 'TODO-B', 'TODO-C', 'TODO-D', 'TODO-E']

export function LogoRowStat() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 border-y border-border">
      <ScrollReveal className="text-center">
        <div className="text-6xl md:text-7xl font-bold text-foreground tracking-[-0.03em]">
          TODO: big number
        </div>
        <p className="mt-2 text-muted-foreground">TODO: what that number means, in one line.</p>
      </ScrollReveal>
      <ScrollReveal delay={0.15} className="mt-12 flex items-center justify-center gap-8 md:gap-12 flex-wrap opacity-70">
        {LOGOS.map(name => (
          <span key={name} className="font-semibold text-muted-foreground tracking-tight">
            {name}
          </span>
        ))}
      </ScrollReveal>
    </section>
  )
}
```

---

### S2 — Single pull quote

When to use: you have one great quote from a real person. Weight a single quote with serif typography instead of padding out a 3-quote row.

```tsx
import { ScrollReveal } from '../components/landing/primitives'

export function PullQuote() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-28">
      <ScrollReveal>
        <blockquote>
          <p className="font-serif italic text-3xl md:text-4xl leading-[1.25] text-foreground">
            &ldquo;TODO: a real sentence a real person said about the product.&rdquo;
          </p>
          <cite className="mt-8 block not-italic font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            — TODO: name · TODO: role
          </cite>
        </blockquote>
      </ScrollReveal>
    </section>
  )
}
```

---

### S3 — Metric trio (animated counters)

When to use: three meaningful numbers that tell a story together. Uses the scaffolded `AnimatedStat` primitive.

```tsx
import { AnimatedStat, StaggerContainer } from '../components/landing/primitives'

const STATS = [
  { value: '99.9%', label: 'TODO: what this measures' },
  { value: '10x', label: 'TODO: what this measures' },
  { value: '<50ms', label: 'TODO: what this measures' },
]

export function MetricTrio() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24">
      <StaggerContainer className="grid grid-cols-3 gap-8">
        {STATS.map(s => (
          <AnimatedStat key={s.label} value={s.value} label={s.label} />
        ))}
      </StaggerContainer>
    </section>
  )
}
```

**Reduced-motion note:** `useCountUp` inside `AnimatedStat` uses `requestAnimationFrame`. The scaffolded primitive doesn't gate it — if your users include people with vestibular sensitivity, either inline a gated version or accept that numbers will count once on entry (usually acceptable).

---

### S4 — Marquee carousel

When to use: you have a lot of real logos or testimonials and want to show breadth. **Use only if your direction tolerates continuous motion.** Horizontal infinite scroll is the #1 offender for reduced-motion regressions — the pattern below gates on `useReducedMotion` and freezes for those users.

```tsx
import { motion, useReducedMotion } from 'framer-motion'

const ITEMS = ['TODO-A', 'TODO-B', 'TODO-C', 'TODO-D', 'TODO-E', 'TODO-F']

export function Marquee() {
  const reduce = useReducedMotion()
  // Duplicate the array so the scroll appears continuous.
  const doubled = [...ITEMS, ...ITEMS]
  return (
    <section className="py-20 overflow-hidden border-y border-border">
      <div className="mx-auto max-w-6xl">
        <motion.div
          animate={reduce ? { x: 0 } : { x: ['0%', '-50%'] }}
          transition={reduce ? undefined : { duration: 30, repeat: Infinity, ease: 'linear' }}
          className="flex items-center gap-12 whitespace-nowrap will-change-transform"
        >
          {doubled.map((name, i) => (
            <span key={`${name}-${i}`} className="text-lg font-semibold text-muted-foreground">
              {name}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
```

---

## CTA patterns

### C1 — Contrast band (full-width)

When to use: the default closer. A full-width band that breaks the page's rhythm and makes the action feel decisive.

```tsx
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { markLandingSeen } from '../pages/landing'
import { ScrollReveal } from '../components/landing/primitives'

export function ContrastBand() {
  const navigate = useNavigate()
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <ScrollReveal>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-[-0.02em]">
            TODO: one-line close.
          </h2>
          <p className="mt-4 opacity-80 max-w-md mx-auto">TODO: one-line support.</p>
          <button
            onClick={() => { markLandingSeen(); navigate('/home') }}
            className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-background text-foreground text-sm font-medium group"
          >
            TODO: verb
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </ScrollReveal>
      </div>
    </section>
  )
}
```

---

### C2 — Centered glow

When to use: subtle close for editorial, minimalist, or premium directions. Page keeps the same background; a soft radial glow behind the CTA gives it weight without a hard color break.

```tsx
import { useNavigate } from 'react-router-dom'
import { markLandingSeen } from '../pages/landing'
import { ScrollReveal } from '../components/landing/primitives'

export function CenteredGlow() {
  const navigate = useNavigate()
  return (
    <section className="relative py-28">
      <div className="absolute inset-0 grid place-items-center pointer-events-none" aria-hidden>
        <div className="w-[600px] h-[600px] rounded-full bg-primary/15 blur-3xl" />
      </div>
      <ScrollReveal className="relative max-w-2xl mx-auto px-6 text-center">
        <h2 className="font-serif italic text-4xl md:text-5xl text-foreground">
          TODO: one quiet close.
        </h2>
        <button
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="mt-8 inline-flex items-center px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium"
        >
          TODO: verb →
        </button>
      </ScrollReveal>
    </section>
  )
}
```

---

### C3 — Asymmetric full-bleed

When to use: brutalist, editorial, or agency directions. Breaks the max-width container — left-anchored giant type, right-anchored button, negative space between.

```tsx
import { useNavigate } from 'react-router-dom'
import { markLandingSeen } from '../pages/landing'
import { ScrollReveal } from '../components/landing/primitives'

export function AsymmetricCTA() {
  const navigate = useNavigate()
  return (
    <section className="border-y-2 border-foreground py-24">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-[2fr_1fr] gap-10 items-end">
        <ScrollReveal>
          <h2 className="font-serif text-[10vw] md:text-8xl leading-[0.92] tracking-[-0.03em] text-foreground">
            TODO: big close.
          </h2>
        </ScrollReveal>
        <ScrollReveal direction="right" delay={0.15} className="md:pb-4">
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">TODO: supporting line.</p>
          <button
            onClick={() => { markLandingSeen(); navigate('/home') }}
            className="mt-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-primary hover:opacity-70"
          >
            TODO: verb →
          </button>
        </ScrollReveal>
      </div>
    </section>
  )
}
```

---

## Footer patterns

### FT1 — Minimal mono

When to use: editorial, zine, or manifesto pages where the footer should disappear into the page. One line of meta-info, one link.

```tsx
export function MinimalMonoFooter() {
  return (
    <footer className="border-t-2 border-foreground mt-24">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          TODO: brand · set in TODO: type · TODO: year
        </span>
        <a href="TODO" className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary hover:underline">
          Contribute →
        </a>
      </div>
    </footer>
  )
}
```

---

### FT2 — Column grid

When to use: default SaaS footer. Brand column + 2–4 link columns + a small attribution row.

```tsx
import { Github, Twitter, Mail } from 'lucide-react'

const LINKS = {
  Product: ['Overview', 'Changelog', 'Pricing'],
  Company: ['About', 'Blog', 'Careers'],
  Resources: ['Docs', 'Community', 'Support'],
}
const SOCIALS = [
  { icon: Github, href: 'TODO', label: 'GitHub' },
  { icon: Twitter, href: 'TODO', label: 'Twitter' },
  { icon: Mail, href: 'TODO', label: 'Email' },
]

export function ColumnFooter() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2">
          <span className="font-semibold text-foreground">TODO: brand</span>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">TODO: one-line product description.</p>
          <div className="mt-5 flex items-center gap-2">
            {SOCIALS.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-9 h-9 grid place-items-center rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
        {Object.entries(LINKS).map(([heading, items]) => (
          <div key={heading}>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">{heading}</h4>
            <ul className="space-y-2">
              {items.map(i => (
                <li key={i}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{i}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-muted-foreground flex justify-between">
          <span>&copy; {new Date().getFullYear()} TODO: brand</span>
          <a href="https://deep.space" className="hover:text-foreground">Built with DeepSpace</a>
        </div>
      </div>
    </footer>
  )
}
```

---

### FT3 — Editorial masthead

When to use: magazine/editorial/zine pages. A footer masthead echoing the nav masthead, closing the "it's a printed issue" metaphor.

```tsx
export function EditorialMasthead() {
  return (
    <footer className="mt-28 border-t-2 border-foreground">
      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 items-baseline gap-3">
        <span className="font-serif italic text-lg text-foreground">TODO: masthead</span>
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Issue №TODO · TODO: date
        </p>
        <p className="sm:text-right text-sm text-muted-foreground">
          Edited by <span className="text-foreground">TODO</span>
        </p>
      </div>
    </footer>
  )
}
```

---

## Scroll & Motion patterns

Skip this section entirely unless your Design Direction calls for scroll choreography. A quiet/still direction ships without any of these.

### SM1 — Parallax background layer

When to use: editorial or atmospheric directions where a slow layer shift behind content adds depth. `useTransform` from `useScroll` bypasses `MotionConfig` — you MUST gate it on `useReducedMotion`.

```tsx
import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

export function ParallaxBackdrop({ imageUrl }: { imageUrl: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-12%', '12%'])

  return (
    <section ref={ref} className="relative h-[80vh] overflow-hidden">
      <motion.div style={{ y: bgY }} className="absolute inset-0 -top-[12%] -bottom-[12%]">
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 to-background" />
      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-24 text-center">
        <h2 className="font-serif italic text-5xl text-foreground">TODO: quiet headline.</h2>
      </div>
    </section>
  )
}
```

---

### SM2 — Pinned section with stage progression

When to use: product walkthroughs — 3–5 stages that advance as the user scrolls through a pinned section. Each stage swaps the visual. Reduced-motion users see the final stage immediately.

```tsx
import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

const STAGES = [
  { title: 'TODO stage 1', body: 'TODO copy.' },
  { title: 'TODO stage 2', body: 'TODO copy.' },
  { title: 'TODO stage 3', body: 'TODO copy.' },
]

export function PinnedStages() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const stageIdx = useTransform(scrollYProgress, [0, 1], reduce ? [STAGES.length - 1, STAGES.length - 1] : [0, STAGES.length - 1])

  return (
    <section ref={ref} className="relative" style={{ height: `${STAGES.length * 80}vh` }}>
      <div className="sticky top-0 h-screen grid md:grid-cols-2 items-center gap-10 max-w-6xl mx-auto px-6">
        <div>
          {STAGES.map((s, i) => (
            <motion.div
              key={i}
              style={{ opacity: useTransform(stageIdx, v => (Math.round(v) === i ? 1 : 0.3)) }}
              className="py-4 border-l-2 border-border pl-5"
            >
              <h3 className="text-xl font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </motion.div>
          ))}
        </div>
        <div className="aspect-video rounded-2xl bg-muted border border-border" />
      </div>
    </section>
  )
}
```

---

### SM3 — Scroll progress indicator

When to use: long-form editorial pages where the user wants to know how far in they are. A thin bar at the top of the viewport.

```tsx
import { motion, useScroll } from 'framer-motion'

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-0.5 bg-primary origin-left z-[60]"
      style={{ scaleX: scrollYProgress }}
    />
  )
}
```

---

### SM4 — Word-by-word reveal heading

When to use: manifesto sites, writing products, kinetic-typography directions. A headline where each word fades in as it enters the viewport. Gated on reduced-motion (reduced users see the whole thing at once).

```tsx
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

export function WordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const inView = useInView(ref, { once: true, margin: '-120px 0px' })
  const reduce = useReducedMotion()
  const words = text.split(' ')

  return (
    <h2 ref={ref} className={className}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={reduce ? { duration: 0 } : { delay: 0.05 * i, duration: 0.4 }}
          className="inline-block mr-[0.3em]"
        >
          {w}
        </motion.span>
      ))}
    </h2>
  )
}

// Usage:
// <WordReveal
//   text="TODO: a slow claim that earns its reveal"
//   className="font-serif text-5xl md:text-7xl text-foreground leading-[1.05]"
// />
```

---

## After you compose

Run the grep gate from `anti-ai-checklist.md` before finishing. Any hit is a bug. Then eyeball-check that the page actually serves the Design Direction you wrote — if it doesn't, the bug isn't in a pattern, it's in your direction commitment.
