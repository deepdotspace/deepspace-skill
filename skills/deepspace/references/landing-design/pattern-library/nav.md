# Nav patterns

6 patterns. Pick ONE that fits your Direction. See `pattern-library.md` for the shared rules + import conventions; the patterns below assume those.

---

## N1 — Dual-state floating pill (RECOMMENDED for SaaS / consumer products)

When to use: most modern SaaS, productivity tools, consumer products. The default workhorse — pick this unless your direction calls for something specific. Three coordinated pieces: a static top nav at page top, a floating pill that materializes on scroll, and an animated mobile dropdown. Active section highlighting works in both desktop states.

```tsx
import { useEffect, useState } from 'react'
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

// Small inline useActiveSection — the scaffolded LandingPage.tsx defines
// one but doesn't export it. Reads from the document scroll, not a custom
// scroll root, so element rects use viewport coords directly.
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const calc = () => {
      const triggerY = window.innerHeight * 0.3
      let cur: string | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= triggerY) cur = id
      }
      setActive(cur)
    }
    calc()
    window.addEventListener('scroll', calc, { passive: true })
    return () => window.removeEventListener('scroll', calc)
  }, [ids])
  return active
}

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const ids = NAV_SECTIONS.map(s => s.id)
  const active = useActiveSection(ids)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // /home is public by default in the scaffold. To force sign-in on click,
  // either swap to a `(protected)/<page>` route or open <AuthOverlay> here.
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
              className="hidden md:inline-flex items-center px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition-transform"
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
                className="ml-1 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition-transform"
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

## N2 — Sticky docs-style top bar

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

## N3 — CRT title card (no nav at all)

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

## N4 — Hamburger-only (mobile-first minimal)

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

## N5 — Inline anchor list (editorial)

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

## N6 — Hover-panel mega menu (Vercel / Stripe style)

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
