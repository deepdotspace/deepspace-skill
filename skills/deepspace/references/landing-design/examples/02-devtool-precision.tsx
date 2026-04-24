/**
 * Example 02 — Developer tool, "Precision"
 *
 * READ-ONLY reference composition. Do NOT import from this file.
 * Read the Design Direction block below to learn how a committed direction
 * becomes concrete design choices — then build your own page from the
 * skill's pattern-library.md.
 *
 * The grep gate will flag any import from `landing-design/examples/`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DESIGN DIRECTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Product.
 *   A CLI + cloud runner that watches your test suite, re-runs the subset
 *   affected by each save, and streams live results to a terminal pane on
 *   any laptop on the team. For teams whose monorepo is too big for local
 *   test runs and too hot for a manual CI gate.
 *
 * Emotion.
 *   The small confidence of seeing a green check scroll past three seconds
 *   after a save. The opposite of "I'll run the full suite overnight."
 *
 * Metaphor.
 *   A blinking cursor in a dark server room. The muffled hum of fans. One
 *   terminal pane, one tail command, everything you need to trust in one
 *   line.
 *
 * Three references from outside dev tools.
 *   1. Teenage Engineering TX-6 mixer — one strip of controls, every dial
 *      has a purpose, nothing decorative. Monochrome aluminum.
 *   2. Swiss railway signage — Frutiger Neue, consistent spacing, pictograms
 *      where text would slow you down.
 *   3. The test-card patterns from an analog oscilloscope manual.
 *
 * Signature element.
 *   A live fake terminal in the hero that types real commands with realistic
 *   variable timing — pauses at punctuation, speeds through whitespace,
 *   occasional micro-stumbles — then streams back stylized green checkmarks.
 *
 * Hero visual.
 *   `$ tests --watch` appears one keystroke at a time. A 400ms pause. Then
 *   `  ✓ 1,204 passing  ·  3.2s` appears in primary-colored mono text,
 *   followed by a second line that flashes as a file saves.
 *
 * ─── Style Tile ───────────────────────────────────────────────────────────
 * - Color: near-black background, soft off-white foreground, one cyan-ish
 *   primary for status markers and CTAs. Zero gradients.
 * - Type: IBM Plex Mono (heading + mono) + Inter (body). Mono headline is a
 *   deliberate statement: the product IS the terminal.
 * - Theme: dark. The tool is used in dim rooms at 11pm.
 * - Art direction: modern minimalism with a technical-minimalism tilt.
 *   Dense typography, small measured whitespace, no decoration.
 * - Motion: mechanical. Linear easings, instant snaps, no bouncing.
 *   Only the terminal cursor pulses.
 * - Voice: verb-first; no adjectives; contractions yes; max 10 words.
 *
 * ─── Sentence test ────────────────────────────────────────────────────────
 * Could this describe any other product? No. The watch-and-stream framing,
 * the "too big for local, too hot for CI" edge, the oscilloscope reference —
 * no other tool, no other dev tool, no generic SaaS.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { ScrollReveal } from '../components/landing/primitives'

// ── Inline helpers ───────────────────────────────────────────────────────────
const LANDING_SEEN_KEY = 'app-landing-seen'
function markLandingSeen() {
  try { localStorage.setItem(LANDING_SEEN_KEY, 'true') } catch {}
}

// ── Signature element: live terminal ─────────────────────────────────────────
const TERMINAL_SCRIPT: Array<{ type: 'in' | 'out' | 'ok'; text: string; pauseAfter?: number }> = [
  { type: 'in', text: '$ runner watch', pauseAfter: 450 },
  { type: 'out', text: '  ▸ indexed 1,204 tests across 38 packages' },
  { type: 'out', text: '  ▸ ready on localhost:5173 · streaming to 4 peers' },
  { type: 'in', text: '~ saved src/billing/invoice.ts', pauseAfter: 220 },
  { type: 'out', text: '  ▸ affected: 7 tests' },
  { type: 'ok', text: '  ✓ 7 passing  ·  1.8s' },
]

function Terminal() {
  const reduce = useReducedMotion()
  const [line, setLine] = useState(0)
  const [char, setChar] = useState(0)

  useEffect(() => {
    if (reduce) { setLine(TERMINAL_SCRIPT.length); return }
    if (line >= TERMINAL_SCRIPT.length) return
    const cur = TERMINAL_SCRIPT[line]
    if (char >= cur.text.length) {
      const t = setTimeout(() => { setLine(n => n + 1); setChar(0) }, cur.pauseAfter ?? 160)
      return () => clearTimeout(t)
    }
    const c = cur.text[char]
    let delay = cur.type === 'in' ? 30 + Math.random() * 40 : 8
    if ('.,:'.includes(c)) delay += 140
    const t = setTimeout(() => setChar(n => n + 1), delay)
    return () => clearTimeout(t)
  }, [line, char, reduce])

  const rendered = TERMINAL_SCRIPT.slice(0, line + 1)
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl font-mono text-[13px] leading-relaxed">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted">
        <span className="w-2.5 h-2.5 rounded-full bg-border" />
        <span className="w-2.5 h-2.5 rounded-full bg-border" />
        <span className="w-2.5 h-2.5 rounded-full bg-border" />
        <span className="ml-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">runner</span>
      </div>
      <div className="p-5 min-h-[280px]">
        {rendered.map((l, i) => {
          const shown = i === line ? l.text.slice(0, char) : l.text
          const color = l.type === 'in' ? 'text-foreground' : l.type === 'ok' ? 'text-primary' : 'text-muted-foreground'
          return (
            <div key={i} className={color}>
              {shown}
              {i === line && !reduce && <span className="inline-block w-[7px] h-[14px] align-middle bg-foreground ml-0.5" style={{ animation: 'terminalBlink 1s steps(1) infinite' }} />}
            </div>
          )
        })}
      </div>
      <style>{`@keyframes terminalBlink { 50% { opacity: 0 } }`}</style>
    </div>
  )
}

// ── Nav (mono, sticky, functional) ───────────────────────────────────────────
function TopBar() {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-mono text-sm font-semibold text-foreground">runner</span>
          <nav className="hidden md:flex items-center gap-6 font-mono text-[13px]">
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">how</a>
            <a href="#perf" className="text-muted-foreground hover:text-foreground transition-colors">perf</a>
            <a href="#docs" className="text-muted-foreground hover:text-foreground transition-colors">docs</a>
          </nav>
        </div>
        <button
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="font-mono text-[13px] font-medium text-primary hover:text-primary/80"
        >
          launch →
        </button>
      </div>
    </header>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const navigate = useNavigate()
  return (
    <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-[1fr_1.25fr] gap-10 items-center">
      <div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="font-mono text-4xl md:text-5xl font-bold text-foreground leading-[1.1] tracking-[-0.02em]"
        >
          Watch tests. Not dashboards.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-5 text-muted-foreground max-w-md"
        >
          Incremental test runs in a single terminal pane, streaming to every teammate on the repo.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex items-center gap-4"
        >
          <button
            onClick={() => { markLandingSeen(); navigate('/home') }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Open runner
            <ArrowRight className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-muted-foreground">or: <span className="text-foreground">brew install runner</span></span>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
        <Terminal />
      </motion.div>
    </section>
  )
}

// ── How it works (code-block feature list — dense, no cards) ─────────────────
const STEPS = [
  {
    label: '01',
    title: 'Install and watch.',
    body: 'One command. Runner indexes your monorepo and starts a local daemon.',
    code: `$ brew install runner\n$ runner watch`,
  },
  {
    label: '02',
    title: 'Save, see green.',
    body: 'Runner maps every changed file to the tests it breaks. Streams the subset.',
    code: `~ saved src/billing.ts\n  ▸ affected: 7 tests\n  ✓ 7 passing · 1.8s`,
  },
  {
    label: '03',
    title: 'Share the pane.',
    body: 'Teammates on the same repo see the same stream. No screen-share, no CI wait.',
    code: `$ runner share --peers 4\n  ▸ streaming to 4 peers`,
  },
]

function HowItWorks() {
  return (
    <section id="how" className="bg-muted py-24">
      <div className="max-w-6xl mx-auto px-6 space-y-16">
        <ScrollReveal>
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">how</span>
          <h2 className="mt-2 font-mono text-3xl md:text-4xl font-bold text-foreground">Three commands. One stream.</h2>
        </ScrollReveal>
        {STEPS.map(step => (
          <ScrollReveal key={step.label} className="grid md:grid-cols-[auto_1fr_1.2fr] gap-6 md:gap-10 items-start">
            <span className="font-mono text-5xl text-primary">{step.label}</span>
            <div>
              <h3 className="font-mono text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm">{step.body}</p>
            </div>
            <pre className="rounded-md border border-border bg-card p-4 overflow-x-auto text-[12px] font-mono text-foreground leading-relaxed">
              <code>{step.code}</code>
            </pre>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

// ── Perf (metric trio) ───────────────────────────────────────────────────────
function Perf() {
  const metrics = [
    { value: '1.8s', label: 'median re-run' },
    { value: '99th', label: 'tests touched per save' },
    { value: '0', label: 'yaml you have to write' },
  ]
  return (
    <section id="perf" className="max-w-5xl mx-auto px-6 py-24">
      <ScrollReveal>
        <div className="grid grid-cols-3 gap-8">
          {metrics.map(m => (
            <div key={m.label} className="text-center">
              <div className="font-mono text-4xl md:text-5xl font-bold text-foreground tracking-tight">{m.value}</div>
              <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  )
}

// ── Pull quote ───────────────────────────────────────────────────────────────
function Quote() {
  return (
    <section className="max-w-3xl mx-auto px-6 pb-24">
      <ScrollReveal>
        <blockquote>
          <p className="font-mono text-xl md:text-2xl leading-[1.35] text-foreground">
            &ldquo;I deleted our CI cache. Runner was faster.&rdquo;
          </p>
          <cite className="mt-5 block not-italic font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            — K. Okoye · eng lead · (real monorepo, 1.4m LOC)
          </cite>
        </blockquote>
      </ScrollReveal>
    </section>
  )
}

// ── CTA (contrast band) ──────────────────────────────────────────────────────
function CTA() {
  const navigate = useNavigate()
  return (
    <section className="bg-foreground text-background">
      <div className="max-w-4xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="font-mono text-3xl md:text-4xl font-bold leading-tight">Save a file.</h2>
          <p className="mt-2 opacity-70 font-mono text-sm">That&rsquo;s the whole demo.</p>
        </div>
        <button
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-background text-foreground font-mono text-sm font-medium"
        >
          <Check className="w-4 h-4" />
          Open runner
        </button>
      </div>
    </section>
  )
}

// ── Footer (minimal mono) ────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        <span>runner · &copy; {new Date().getFullYear()}</span>
        <a href="TODO" className="hover:text-foreground">docs</a>
      </div>
    </footer>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        <TopBar />
        <Hero />
        <HowItWorks />
        <Perf />
        <Quote />
        <CTA />
        <Footer />
      </div>
    </MotionConfig>
  )
}
