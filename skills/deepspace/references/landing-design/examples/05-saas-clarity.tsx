/**
 * Example 05 — SaaS, "The Friday-afternoon recap"
 *
 * READ-ONLY reference composition. Do NOT import from this file.
 * Read the Design Direction block below to learn how a committed direction
 * becomes concrete design choices — then build your own page from the
 * skill's pattern-library.md.
 *
 * The grep gate will flag any import from `landing-design/examples/`.
 *
 * THIS EXAMPLE DEMONSTRATES — read it specifically when your direction is SaaS:
 *   - The N1 dual-state floating-pill nav with active-section highlighting
 *     (the workhorse pattern; everything else here exists to show it working).
 *   - A FAQ accordion section.
 *   - A bento hero with an animated React product mockup (no AI image).
 *   - A bento feature grid that explicitly avoids 3-identical-cards.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DESIGN DIRECTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Product.
 *   A weekly-review app for small engineering teams (5–25 people). Every
 *   Friday at 3pm, the dashboard auto-fills: what shipped, what slipped, who
 *   was blocked, and one paragraph for the staff-eng to read Saturday before
 *   deciding next week's plan. Not a tracker. Not Jira. A recap.
 *
 * Emotion.
 *   The relief of finishing a Friday-afternoon planning thread with an
 *   actual decision instead of a "let's circle back Monday." The exact
 *   moment a manager closes the laptop and the weekend genuinely starts.
 *
 * Metaphor.
 *   A one-page-per-week paper binder kept in a manager's bottom drawer —
 *   the kind that fills with hand-written annotations over a year. Not
 *   another dashboard. Not another Slack channel. A folio.
 *
 * Three references from OUTSIDE SaaS / B2B / dev tools.
 *   1. An Eames-era weekly desk planner — everything important in one folio
 *      per week, generous whitespace, one accent ink color.
 *   2. Ina Garten's prep-list pages — declarative, three categories, no
 *      decoration, the kind of clarity that makes a complex day feel small.
 *   3. The print layout of The Economist's KAL editorial cartoon column —
 *      tight grid, dense information, one hairline accent.
 *
 * Signature element.
 *   An animated bento dashboard mockup in the hero where, on first view, ONE
 *   tile draws a chart line, ANOTHER tile flips a status pill from amber to
 *   moss-green, and the "Friday decision" card writes itself one word at a
 *   time over ~3 seconds. The page sits still after that — the mockup runs
 *   ONCE, like a Polaroid finishing developing.
 *
 * Hero visual.
 *   Split-screen. Left: "Friday afternoon, in one screen." in a clean sans
 *   at ~72px, supporting line, primary CTA. Right: the bento mockup, taking
 *   up most of the right column. As soon as the page loads, the chart line
 *   draws itself, the status flips, the recap text types in. Then it stops.
 *
 * ─── Style Tile ───────────────────────────────────────────────────────────
 * - Color: warm off-white dominant; deep ink-blue primary; one moss-green
 *   "status" accent. Muted everywhere — even the CTA is full-saturation but
 *   used sparingly.
 * - Type: Inter (heading + body) + IBM Plex Mono (dashboard data). Inter as
 *   a deliberate choice: clarity beats personality for a recap tool. The
 *   mono in the mockup makes "this is data" obvious without ornament.
 * - Theme: light. Friday afternoon, sun in a kitchen window. Dark-mode
 *   would be a lie about who uses this and when.
 * - Art direction: bento-modular with editorial restraint. Bento for the
 *   hero mockup + features grid; magazine-style hierarchy elsewhere.
 * - Motion: subtle drift. The bento mockup runs ONCE on load. After that,
 *   only fade-in-on-scroll. No marquees, no parallax, no continuous loops.
 * - Voice: declarative; second-person; max 14 words; never starts with "we";
 *   zero exclamation points.
 *
 * ─── Sentence test ────────────────────────────────────────────────────────
 * Could this describe any other product? No. The Friday-3pm cadence, the
 * "one paragraph for the staff-eng to read Saturday" specificity, the
 * Eames/Garten/Economist reference set, and the once-only animation
 * personality define THIS product. They don't transfer to Linear, Asana,
 * Notion, or any analytics dashboard.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MotionConfig, motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Menu, X, Plus, Minus } from 'lucide-react'
import { ScrollReveal } from '../components/landing/primitives'

// ── Inline helpers (scaffolded primitives don't export these) ────────────────

const LANDING_SEEN_KEY = 'app-landing-seen'
function markLandingSeen() {
  try { localStorage.setItem(LANDING_SEEN_KEY, 'true') } catch {}
}

function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const calc = () => {
      // Trigger line ~30% down the viewport — a section is "active" as soon
      // as its top crosses above this line. Element rects are in viewport
      // coords, so the threshold is just window.innerHeight * 0.3.
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

const cn = (...args: any[]) => args.filter(Boolean).join(' ')

// ── Constants ────────────────────────────────────────────────────────────────

const APP_NAME = 'Folio'
const NAV_SECTIONS = [
  { id: 'features', label: 'Features' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'faq', label: 'FAQ' },
] as const

// ── N1 Floating-pill nav (the workhorse pattern) ─────────────────────────────

function FloatingPillNav() {
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
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // The scaffold's `/home` is public by default. To force sign-in on click,
  // either swap to a `/(protected)/<page>` route or replace this with a
  // useState-driven `<AuthOverlay onClose={...} />` open. In a standalone
  // harness without `/home` routed, this silently no-ops — expected.
  const enterApp = () => { markLandingSeen(); navigate('/home') }

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
          <span className="text-lg font-semibold tracking-tight text-foreground">{APP_NAME}</span>
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
              Start free
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
            <div className="pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-full bg-background/85 backdrop-blur-2xl border border-border shadow-lg">
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
                Start free
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Signature element: animated bento dashboard mockup ───────────────────────

function ChartTile() {
  const reduce = useReducedMotion()
  return (
    <div className="rounded-xl bg-card border border-border p-4 h-full flex flex-col">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Shipped</span>
        <span className="text-2xl font-semibold tabular-nums text-foreground">14</span>
      </div>
      <svg viewBox="0 0 200 60" className="mt-3 flex-1 w-full text-primary" aria-hidden>
        <motion.polyline
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          points="0,50 30,42 60,46 90,32 120,30 150,18 180,12 200,8"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: reduce ? 1 : 1, opacity: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 1.6, delay: 0.6, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  )
}

function StatusTile() {
  const reduce = useReducedMotion()
  const [shipped, setShipped] = useState(reduce)
  useEffect(() => {
    if (reduce) { setShipped(true); return }
    const t = setTimeout(() => setShipped(true), 1800)
    return () => clearTimeout(t)
  }, [reduce])
  return (
    <div className="rounded-xl bg-card border border-border p-4 h-full">
      <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Auth migration</span>
      <div className="mt-3 flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full transition-colors duration-500', shipped ? 'bg-primary' : 'bg-muted-foreground/40')} />
        <motion.span
          key={String(shipped)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('text-sm font-medium', shipped ? 'text-foreground' : 'text-muted-foreground')}
        >
          {shipped ? 'Shipped Thu' : 'In review'}
        </motion.span>
      </div>
      <div className="mt-3 space-y-1">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '40%' }}
            animate={{ width: shipped ? '100%' : '40%' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">3 PRs · 2 reviewers</span>
      </div>
    </div>
  )
}

function RecapTile() {
  const reduce = useReducedMotion()
  const text = 'You shipped the auth migration. R. is blocked on the index. Plan Monday around the index, not auth.'
  const [shown, setShown] = useState(reduce ? text.length : 0)
  useEffect(() => {
    if (reduce) return
    let i = 0
    const tick = () => {
      i += 1
      setShown(i)
      if (i < text.length) {
        const c = text[i]
        const delay = '.,'.includes(c) ? 110 : 26
        return setTimeout(tick, delay)
      }
    }
    const start = setTimeout(tick, 1200)
    return () => clearTimeout(start)
  }, [reduce])
  return (
    <div className="rounded-xl bg-foreground text-background p-4 h-full flex flex-col">
      <span className="text-[11px] font-mono uppercase tracking-[0.18em] opacity-60">Friday recap · 3:00 PM</span>
      <p className="mt-3 text-sm leading-snug font-medium">
        {text.slice(0, shown)}
        {!reduce && shown < text.length && <span className="inline-block w-1.5 h-4 align-middle bg-background ml-0.5 animate-pulse" />}
      </p>
    </div>
  )
}

function BlockedTile() {
  return (
    <div className="rounded-xl bg-card border border-border p-4 h-full">
      <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Blocked</span>
      <div className="mt-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-muted grid place-items-center text-xs font-semibold text-foreground">R</span>
        <div>
          <p className="text-sm font-medium text-foreground leading-tight">R. — search index</p>
          <p className="text-[11px] text-muted-foreground">since Wed</p>
        </div>
      </div>
    </div>
  )
}

function BentoMockup() {
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-3 aspect-[5/4] w-full">
      <div className="col-span-2 row-span-1"><ChartTile /></div>
      <div className="col-span-1 row-span-1"><StatusTile /></div>
      <div className="col-span-2 row-span-1"><RecapTile /></div>
      <div className="col-span-1 row-span-1"><BlockedTile /></div>
    </div>
  )
}

// ── Hero (H1 split-screen) ───────────────────────────────────────────────────

function Hero() {
  const navigate = useNavigate()
  return (
    <section className="relative max-w-6xl mx-auto px-6 pt-32 pb-24 grid md:grid-cols-[1fr_1.15fr] gap-12 items-center">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl md:text-6xl font-bold tracking-[-0.02em] leading-[1.04] text-foreground"
        >
          Friday afternoon, in one screen.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed"
        >
          A weekly recap for engineering managers. What shipped, what slipped,
          who&rsquo;s blocked — written for you, every Friday at 3.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 flex items-center gap-5"
        >
          <button
            onClick={() => { markLandingSeen(); navigate('/home') }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 group"
          >
            Start the recap
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <span className="text-sm text-muted-foreground">Free for teams under 10.</span>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.7 }}
      >
        <BentoMockup />
      </motion.div>
    </section>
  )
}

// ── Features (F3 bento, with size = hierarchy) ───────────────────────────────

const FEATURES = [
  {
    span: 'col-span-6 md:col-span-4 md:row-span-2',
    label: 'The recap',
    title: 'One paragraph. Every Friday.',
    body: 'A short note your staff-eng can read on Saturday — written from your shipped, slipped, and blocked items. No edits required.',
  },
  {
    span: 'col-span-3 md:col-span-2',
    label: 'Pull, don\u2019t push',
    title: 'Reads from GitHub + Linear.',
    body: 'No new boards. No standup ritual.',
  },
  {
    span: 'col-span-3 md:col-span-2',
    label: 'Quiet by default',
    title: 'One Slack message. Friday.',
    body: 'Not 14. Not at 9 AM. Not a digest.',
  },
  {
    span: 'col-span-6 md:col-span-3',
    label: 'Signal, not stats',
    title: '“Who is blocked?” gets surfaced first.',
    body: 'Velocity is fine. Knowing R. has been waiting on the index since Wed is more useful.',
  },
  {
    span: 'col-span-6 md:col-span-3',
    label: 'Your folio',
    title: 'A weekly entry that sticks around.',
    body: 'A year from now, you\u2019ll know what last June actually looked like.',
  },
]

function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-28 md:py-36">
      <ScrollReveal className="mb-12">
        <span className="text-xs font-mono uppercase tracking-[0.25em] text-primary">What it does</span>
        <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-[-0.02em] text-foreground max-w-2xl leading-[1.1]">
          A folio, not a tracker.
        </h2>
      </ScrollReveal>
      <div className="grid grid-cols-6 auto-rows-[minmax(150px,_auto)] gap-3 md:gap-4">
        {FEATURES.map((f, i) => (
          <ScrollReveal key={i} delay={0.05 * i} className={f.span}>
            <div className="h-full rounded-2xl bg-card border border-border p-6 flex flex-col justify-between">
              <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">{f.label}</span>
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-foreground leading-snug">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

// ── Workflow (F4 single-showcase) ────────────────────────────────────────────

function Workflow() {
  return (
    <section id="workflow" className="bg-muted py-28">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal>
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-primary">The week, condensed</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-[-0.02em] text-foreground leading-[1.1]">
            You skim it Saturday morning over coffee.
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.15} className="mt-12 rounded-2xl bg-card border border-border p-8 md:p-10">
          <div className="grid md:grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">Shipped</span>
            <p className="text-foreground">Auth migration · search 2.0 · onboarding tweak.</p>

            <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">Slipped</span>
            <p className="text-foreground">Pricing-page redesign — moved to next sprint at K.&rsquo;s ask.</p>

            <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">Blocked</span>
            <p className="text-foreground">R. — waiting on the search index since Wed afternoon.</p>

            <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">For Saturday</span>
            <p className="font-semibold text-foreground leading-snug">
              Plan Monday around the index. Auth is done; pricing can wait one more week.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ── FAQ accordion (the section the user asked for) ───────────────────────────

const FAQ = [
  {
    q: 'How does it know what shipped?',
    a: 'It pulls merged PRs and closed Linear issues for your repo + workspace. You connect once, it stays in sync. No manual entry.',
  },
  {
    q: 'Why not Slack?',
    a: 'Slack is fine for the message. The folio is the page that survives the message. A year from now you can read June.',
  },
  {
    q: 'Who writes the recap paragraph?',
    a: 'A small model writes a draft from the data; you can edit it in 30 seconds before it sends, or let it auto-send at 3 PM Friday.',
  },
  {
    q: 'Will my team see it?',
    a: 'Only if you share it. The default is private to you — folio is for the manager\u2019s Saturday-morning read, not the team channel.',
  },
  {
    q: 'What does it cost?',
    a: 'Free under 10 contributors. $9 per contributor per month above that. No annual lock-in.',
  },
]

function FAQItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-4 py-5 text-left">
        <span className={cn('text-base md:text-lg font-medium transition-colors', isOpen ? 'text-foreground' : 'text-muted-foreground')}>
          {q}
        </span>
        <span className={cn('shrink-0 w-8 h-8 rounded-full grid place-items-center transition-colors', isOpen ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-28 md:py-36">
      <ScrollReveal>
        <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] text-foreground">Questions, answered.</h2>
      </ScrollReveal>
      <ScrollReveal delay={0.1} className="mt-10 rounded-2xl bg-card border border-border px-7 md:px-10 py-2">
        {FAQ.map((item, i) => (
          <FAQItem
            key={item.q}
            q={item.q}
            a={item.a}
            isOpen={openIdx === i}
            onToggle={() => setOpenIdx(p => (p === i ? null : i))}
          />
        ))}
      </ScrollReveal>
    </section>
  )
}

// ── CTA (C1 contrast band) ───────────────────────────────────────────────────

function CTA() {
  const navigate = useNavigate()
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <ScrollReveal>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-[-0.02em]">
            Close Friday, not your laptop.
          </h2>
          <p className="mt-4 max-w-md mx-auto opacity-85">
            Connect your repo. Get this week&rsquo;s folio in five minutes.
          </p>
          <button
            onClick={() => { markLandingSeen(); navigate('/home') }}
            className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-md bg-background text-foreground text-sm font-medium group"
          >
            <Check className="w-4 h-4" />
            Start the recap
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ── Footer (FT2 column grid, trimmed) ────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2">
          <span className="font-semibold text-foreground">{APP_NAME}</span>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            A weekly folio for engineering managers.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">Product</h4>
          <ul className="space-y-2 text-sm">
            {['Features', 'Pricing', 'Changelog'].map(l => (
              <li key={l}><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">Company</h4>
          <ul className="space-y-2 text-sm">
            {['About', 'Blog', 'Contact'].map(l => (
              <li key={l}><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-muted-foreground flex justify-between">
          <span>&copy; {new Date().getFullYear()} {APP_NAME}</span>
          <a href="https://deep.space" className="hover:text-foreground">Built with DeepSpace</a>
        </div>
      </div>
    </footer>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        <FloatingPillNav />
        <Hero />
        <Features />
        <Workflow />
        <FAQSection />
        <CTA />
        <Footer />
      </div>
    </MotionConfig>
  )
}
