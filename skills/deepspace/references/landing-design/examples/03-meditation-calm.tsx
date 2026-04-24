/**
 * Example 03 — Meditation app, "Spacious calm"
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
 *   A daily breathing app. One guided 4-7-8 breath cycle every morning,
 *   one minute long. No meditation library, no courses, no leaderboard.
 *   You open it, you breathe, you close it.
 *
 * Emotion.
 *   The long exhale after a hard conversation. The second before you open
 *   your eyes. Not "peaceful" — the specific weightlessness of the pause
 *   between breaths.
 *
 * Metaphor.
 *   The horizon line at dawn, before the sky has color in it. Flat.
 *   Still. Everything is still about to happen.
 *
 * Three references from outside wellness apps.
 *   1. The inside of a Rothko chapel — large color fields, no figures,
 *      an absence that asks you to sit with it.
 *   2. Japanese minimalist bookstore design — one object on a shelf, an
 *      ocean of whitespace, one spot of subtle green.
 *   3. The opening shot of Tarkovsky's Solaris — a slow pan over reeds
 *      in still water, nothing happens, you can't look away.
 *
 * Signature element.
 *   A breath circle that pulses at 4.5 seconds per cycle as the hero
 *   centerpiece. 4.5 is slow — slower than a UI animation should be.
 *   The slowness is the point. A UX rhythm (1s, 2s) would make it read
 *   as a loading spinner and destroy the entire direction.
 *
 * Hero visual.
 *   A single soft-edged circle fills the center of the viewport. It
 *   scales from 0.9 to 1.1 over 4.5 seconds, then back, indefinitely.
 *   Behind it: nothing — just cream. A single serif word ("Breathe.")
 *   fades in beside it, not in it.
 *
 * ─── Style Tile ───────────────────────────────────────────────────────────
 * - Color: cream dominant, sage accent, desaturated everywhere. No vivid
 *   anything — even the CTA is primary/60.
 * - Type: Cormorant (display serif, generous counters) + Lato (body).
 *   Cormorant has restraint Garamond doesn't.
 * - Theme: light. The product is morning; light is right.
 * - Art direction: modern minimalism. Generous whitespace, one object
 *   per viewport, refined type.
 * - Motion: stillness. The breath circle is the only animation. Sections
 *   fade in once, then never move.
 * - Voice: generous sentences; no urgency words; never rhetorical "why?".
 *
 * ─── Sentence test ────────────────────────────────────────────────────────
 * Could this describe any other product? No. "One minute, then close it"
 * defines the entire philosophy and rules out ~all wellness apps. The
 * 4.5-second breath circle and Tarkovsky reference make it this specific
 * app and not a Calm clone.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useNavigate } from 'react-router-dom'
import { MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { ScrollReveal } from '../components/landing/primitives'

// ── Inline helpers ───────────────────────────────────────────────────────────
const LANDING_SEEN_KEY = 'app-landing-seen'
function markLandingSeen() {
  try { localStorage.setItem(LANDING_SEEN_KEY, 'true') } catch {}
}

// ── Signature element: breath circle ─────────────────────────────────────────
function BreathCircle() {
  const reduce = useReducedMotion()
  return (
    <div className="relative w-[280px] h-[280px] md:w-[420px] md:h-[420px] grid place-items-center" aria-label="Breath animation">
      {/* Outer ring — barely there */}
      <motion.div
        className="absolute inset-0 rounded-full border border-primary/20"
        animate={reduce ? undefined : { scale: [0.92, 1.08, 0.92], opacity: [0.6, 1, 0.6] }}
        transition={reduce ? undefined : { duration: 4.5, repeat: Infinity, ease: [0.45, 0.05, 0.55, 0.95] }}
      />
      {/* Inner cloud — softer */}
      <motion.div
        className="w-3/4 h-3/4 rounded-full bg-primary/10 blur-2xl"
        animate={reduce ? undefined : { scale: [0.9, 1.1, 0.9] }}
        transition={reduce ? undefined : { duration: 4.5, repeat: Infinity, ease: [0.45, 0.05, 0.55, 0.95] }}
      />
      {/* Focal dot */}
      <motion.div
        className="absolute w-2 h-2 rounded-full bg-primary"
        animate={reduce ? undefined : { scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
        transition={reduce ? undefined : { duration: 4.5, repeat: Infinity, ease: [0.45, 0.05, 0.55, 0.95] }}
      />
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const navigate = useNavigate()
  return (
    <section className="min-h-[92vh] max-w-5xl mx-auto px-6 grid md:grid-cols-2 items-center">
      <div className="relative order-2 md:order-1 py-16 md:py-0">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="font-serif text-6xl md:text-7xl leading-[1.02] text-foreground"
        >
          Breathe.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-6 font-serif italic text-lg text-muted-foreground max-w-sm leading-relaxed"
        >
          One minute in the morning. Then you close the app.
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.8 }}
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="mt-10 inline-flex items-center px-6 py-3 rounded-full bg-primary/60 text-primary-foreground text-sm tracking-wide hover:bg-primary/75 transition-colors"
        >
          Begin
        </motion.button>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6 }}
        className="order-1 md:order-2 grid place-items-center"
      >
        <BreathCircle />
      </motion.div>
    </section>
  )
}

// ── What happens (single scrolling showcase — sparse, one idea) ──────────────
function WhatHappens() {
  return (
    <section id="how" className="max-w-3xl mx-auto px-6 py-32">
      <ScrollReveal>
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-primary">The practice</p>
        <h2 className="mt-4 font-serif text-4xl md:text-5xl leading-[1.15] text-foreground">
          Inhale for four. Hold for seven. Exhale for eight.
        </h2>
        <p className="mt-6 font-serif italic text-lg text-muted-foreground leading-relaxed">
          A single 4-7-8 cycle, guided by a circle. No meditations to pick,
          no courses to start, no streaks to maintain. You don&rsquo;t need
          an app to breathe. You need a minute.
        </p>
      </ScrollReveal>
    </section>
  )
}

// ── Quiet quote ──────────────────────────────────────────────────────────────
function Quote() {
  return (
    <section className="max-w-2xl mx-auto px-6 pb-32">
      <ScrollReveal>
        <blockquote className="text-center">
          <p className="font-serif italic text-2xl md:text-3xl leading-[1.35] text-foreground">
            &ldquo;I opened it for a minute. I closed it for a minute. Then
            I went to work.&rdquo;
          </p>
          <cite className="mt-6 block not-italic text-xs tracking-[0.3em] uppercase text-muted-foreground">
            — a user, unsolicited
          </cite>
        </blockquote>
      </ScrollReveal>
    </section>
  )
}

// ── Three lines that describe the whole product ──────────────────────────────
function ThreeLines() {
  const lines = [
    'One minute.',
    'Once a day.',
    'Then the app closes itself.',
  ]
  return (
    <section className="max-w-3xl mx-auto px-6 pb-32">
      <div className="border-t border-border pt-16">
        {lines.map((l, i) => (
          <ScrollReveal key={i} delay={i * 0.3}>
            <p className="font-serif italic text-3xl md:text-4xl leading-[1.4] text-foreground text-center py-4">
              {l}
            </p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

// ── Minimal footer ───────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="max-w-3xl mx-auto px-6 py-12 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
        A quiet practice · made in &mdash;
      </p>
    </footer>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        <Hero />
        <WhatHappens />
        <Quote />
        <ThreeLines />
        <Footer />
      </div>
    </MotionConfig>
  )
}
