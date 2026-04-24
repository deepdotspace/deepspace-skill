/**
 * Example 01 — Cooking app, "Sunday kitchen warmth"
 *
 * READ-ONLY reference composition. Do NOT import from this file.
 * Read the Design Direction block below to learn how a committed direction
 * becomes concrete design choices — then build your own page from the
 * skill's pattern-library.md.
 *
 * The grep gate will flag any import from `landing-design/examples/`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DESIGN DIRECTION (filled — this is the teaching artifact)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Product — one sentence, what it does for whom.
 *   A weekly recipe club for people who want to cook dinner at home but are
 *   tired of decision fatigue. Every Sunday, three recipes land in your
 *   inbox, each with a shopping list and a story about where it came from.
 *
 * Emotion — one specific feeling, not a category.
 *   Sunday morning, second coffee, nowhere to be. The window is open, someone
 *   is making noise in the kitchen downstairs. The feeling of being fed by
 *   someone who took their time.
 *
 * Metaphor — a concrete real-world image.
 *   A handwritten recipe card on a butcher-block table next to a worn
 *   enameled mug. Morning light coming in at a low angle. A thumbprint of
 *   flour on the edge of the card.
 *
 * Three references from OUTSIDE the cooking-app category.
 *   1. Kinfolk magazine — warm off-white, generous whitespace, editorial
 *      photography, small serif captions, zero animation. Restraint.
 *   2. Le Creuset product packaging — cream + terracotta, oversized serif
 *      product names, matte textures, the feeling of something heirloom.
 *   3. Wes Anderson color palettes — symmetric compositions with one
 *      unexpected pop of color (a soft mint, a washed coral).
 *
 * Signature element — one thing that makes the page memorable.
 *   Torn-paper SVG dividers between sections. The torn edge is hand-drawn as
 *   a path, slightly uneven. Each section looks like a page torn from a
 *   notebook and placed on the table.
 *
 * Hero visual — concretely, what animates in the first 5 seconds.
 *   A slightly tilted "recipe card" rendered as styled divs with torn edges.
 *   The headline "Dinner, written by hand." sits on the card in a serif
 *   display font. Behind the card, two soft curved SVG paths rise slowly
 *   like steam from a mug just off-frame, then fade.
 *
 * ─── Style Tile ───────────────────────────────────────────────────────────
 * - Color: warm cream dominant, deep terracotta accent, muted everywhere
 *   except a single vivid accent on the CTA. (Matches the app's @theme.)
 * - Type: Fraunces (serif, display) + Source Sans 3 (body). Fraunces has
 *   a variable warmth axis — we want the warm end.
 * - Theme: light. This is a paper surface, not a screen.
 * - Art direction: editorial. Magazine-style hierarchy, two-column body,
 *   small-caps labels, torn-paper dividers as the signature.
 * - Motion: subtle drift. Scroll-triggered fades, small staggers. The steam
 *   above the hero is the only continuous animation, and it's 3s slow.
 * - Voice: uses second-person; contractions yes; never starts with "we".
 *
 * ─── Sentence test ────────────────────────────────────────────────────────
 * Could this direction describe any other product?
 *   No. The weekly cadence, handwritten feel, decision-fatigue frame, and
 *   "fed by someone who took their time" emotion — none transfer to a dev
 *   tool, meditation app, game, or fintech. Every choice below serves this.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { ScrollReveal } from '../components/landing/primitives'

// ── Inline helpers (the scaffolded primitives don't export these) ────────────
const LANDING_SEEN_KEY = 'app-landing-seen'
function markLandingSeen() {
  try { localStorage.setItem(LANDING_SEEN_KEY, 'true') } catch {}
}

// ── Signature element: torn-paper SVG divider ────────────────────────────────
function TornPaperDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`relative w-full h-6 ${flip ? 'rotate-180' : ''}`} aria-hidden>
      <svg className="absolute inset-0 w-full h-full text-background" viewBox="0 0 1200 24" preserveAspectRatio="none">
        <path
          d="M0,0 L0,14 L60,10 L130,18 L220,8 L310,16 L400,6 L490,14 L580,10 L670,18 L760,8 L850,14 L940,6 L1030,16 L1120,10 L1200,18 L1200,0 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  )
}

// ── Hero steam (continuous animation — gated on reduced motion) ──────────────
function RisingSteam() {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <svg className="absolute -top-10 right-8 w-16 h-28 text-primary/30" viewBox="0 0 64 112" aria-hidden>
      {[0, 1].map(i => (
        <motion.path
          key={i}
          d={`M${22 + i * 14},100 C${18 + i * 14},80 ${30 + i * 14},60 ${22 + i * 14},40 C${16 + i * 14},20 ${28 + i * 14},10 ${22 + i * 14},0`}
          stroke="currentColor"
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 0.8, 0], y: [20, -20] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 1.5, ease: 'easeOut' }}
        />
      ))}
    </svg>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const navigate = useNavigate()
  return (
    <section className="max-w-5xl mx-auto px-6 pt-12 pb-20">
      <div className="flex items-baseline justify-between border-b-2 border-foreground pb-3">
        <span className="font-serif italic text-xl text-foreground">The Sunday Pantry</span>
        <span className="hidden sm:block font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Weekly · No. 14
        </span>
      </div>

      <div className="relative mt-16 grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
        {/* The tilted "recipe card" — the hero's commanding visual. */}
        <motion.div
          initial={{ opacity: 0, y: 10, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ duration: 0.8, ease: [0.22, 0.9, 0.3, 1] }}
          className="relative bg-card border border-border shadow-lg p-8 md:p-12"
          style={{ transform: 'rotate(-2deg)' }}
        >
          <RisingSteam />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Recipe № 42</span>
          <h1 className="mt-4 font-serif text-5xl md:text-7xl leading-[0.95] text-foreground">
            Dinner, written by hand.
          </h1>
          <p className="mt-6 max-w-md text-base text-foreground/80 leading-relaxed">
            Three recipes every Sunday, each with a shopping list and a story.
            Cook better weeknights without having to decide.
          </p>
          <button
            onClick={() => { markLandingSeen(); navigate('/home') }}
            className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-none border-2 border-foreground bg-foreground text-background text-sm font-medium group hover:bg-primary hover:border-primary transition-colors"
          >
            Start cooking
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="hidden md:block font-serif text-2xl italic leading-relaxed text-muted-foreground"
        >
          <p>Like a recipe card your aunt sent you.</p>
          <p className="mt-4">With a thumbprint of flour.</p>
        </motion.div>
      </div>
    </section>
  )
}

// ── What you get (alternating rows, editorial tone) ──────────────────────────
const ROWS = [
  {
    label: 'Sundays',
    title: 'Three recipes, every week.',
    body: 'Pulled from home kitchens — not food blogs. Each comes with the grocery list already built.',
  },
  {
    label: 'Stories',
    title: 'A paragraph of where it came from.',
    body: 'Whose kitchen, whose Sunday, which complaints it was invented to fix. Reading it makes you want to cook it.',
  },
]

function WhatYouGet() {
  return (
    <section id="features" className="bg-muted py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6 space-y-20">
        {ROWS.map((row, i) => (
          <div key={row.title} className={`flex flex-col ${i % 2 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-10 md:gap-16 items-center`}>
            <ScrollReveal direction={i % 2 ? 'right' : 'left'} className="flex-1 w-full">
              {/* Tiny hand-drawn visual — styled divs, no AI image. */}
              <div className="aspect-[5/4] bg-card border border-border relative overflow-hidden">
                <div className="absolute inset-6 border border-foreground/30 p-4">
                  <div className="h-2 w-2/3 bg-foreground/60" />
                  <div className="mt-3 space-y-1.5">
                    {[68, 52, 78, 44].map((w, k) => (
                      <div key={k} className="h-[2px] bg-foreground/30" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  <div className="mt-5 font-serif italic text-lg text-primary">{i === 0 ? '— turns out chicken —' : '— she called it Monday stew —'}</div>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction={i % 2 ? 'left' : 'right'} delay={0.1} className="flex-1 max-w-md">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{row.label}</span>
              <h3 className="mt-2 font-serif text-3xl md:text-4xl leading-tight text-foreground">{row.title}</h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">{row.body}</p>
            </ScrollReveal>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Single pull quote ────────────────────────────────────────────────────────
function PullQuote() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-28">
      <ScrollReveal>
        <blockquote>
          <p className="font-serif italic text-3xl md:text-4xl leading-[1.25] text-foreground">
            &ldquo;I canceled my meal kit. I&rsquo;m actually cooking now, on purpose.&rdquo;
          </p>
          <cite className="mt-6 block not-italic font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            — Ellis M. · subscriber since week 4
          </cite>
        </blockquote>
      </ScrollReveal>
    </section>
  )
}

// ── Quiet CTA ────────────────────────────────────────────────────────────────
function CTA() {
  const navigate = useNavigate()
  return (
    <section className="relative py-24">
      <div className="absolute inset-0 grid place-items-center pointer-events-none" aria-hidden>
        <div className="w-[600px] h-[600px] rounded-full bg-primary/15 blur-3xl" />
      </div>
      <ScrollReveal className="relative max-w-2xl mx-auto px-6 text-center">
        <h2 className="font-serif italic text-4xl md:text-5xl text-foreground">
          Cook something good on Tuesday.
        </h2>
        <p className="mt-4 text-muted-foreground">First issue lands this Sunday.</p>
        <button
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-none border-2 border-foreground bg-foreground text-background text-sm font-medium hover:bg-primary hover:border-primary transition-colors"
        >
          Join the club →
        </button>
      </ScrollReveal>
    </section>
  )
}

// ── Editorial masthead footer ────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="mt-12 border-t-2 border-foreground">
      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-baseline justify-between gap-2">
        <span className="font-serif italic text-lg text-foreground">The Sunday Pantry</span>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Set in Fraunces &amp; Source Sans · delivered by email · cancel anytime
        </p>
      </div>
    </footer>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  return (
    <MotionConfig reducedMotion="user">
      <div ref={containerRef} className="min-h-screen bg-background text-foreground">
        <Hero />
        <TornPaperDivider />
        <WhatYouGet />
        <TornPaperDivider flip />
        <PullQuote />
        <CTA />
        <Footer />
      </div>
    </MotionConfig>
  )
}
