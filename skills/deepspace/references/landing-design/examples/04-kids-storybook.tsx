/**
 * Example 04 — Children's storybook app, "Playful & tactile"
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
 *   A bedtime storybook app for kids aged 3–7. Parents choose a theme
 *   (dinosaurs, space, grandma's kitchen), the app generates a short
 *   illustrated story, parent reads it aloud with the kid tracing words.
 *   Each story is 7 pages, ~120 words.
 *
 * Emotion.
 *   The giddy 7:30 PM energy before a bath and a story. A kid squeezing
 *   a worn paperback they've read 40 times. The specific feeling of
 *   construction-paper-and-crayon in a kindergarten classroom.
 *
 * Metaphor.
 *   A paper-cut-out diorama on a child's bedroom floor. Uneven scissor
 *   lines, tape on the back, a crayon smudge. Homemade, not polished.
 *
 * Three references from outside kids apps.
 *   1. Eric Carle illustrations — torn tissue paper, primary colors on
 *      white, nothing precise about the edges.
 *   2. The color script of Pixar's Up — warm yellows, coral reds, with
 *      a single quiet teal moment per scene.
 *   3. Sanrio stationery — simple shapes, lots of whitespace, face on
 *      everything, tactile offset-printed look.
 *
 * Signature element.
 *   Hand-drawn SVG elements that wobble subtly on hover + a paper-grain
 *   texture overlay on the whole page. The wobble is the thing: it says
 *   "this was drawn by a person, not rendered by a template."
 *
 * Hero visual.
 *   A crooked paper cut-out of a dinosaur (inline SVG), wobbling gently.
 *   Behind it: torn-paper mountains in coral + warm yellow. A speech
 *   bubble next to it says "Read me a story?" in a round sans-serif.
 *
 * ─── Style Tile ───────────────────────────────────────────────────────────
 * - Color: warm yellow dominant, coral accent, one quiet teal detail.
 *   Saturation is high but not neon — think offset-printed zine, not
 *   Fruit Loops commercial.
 * - Type: Nunito for everything. Round, friendly, reads well at 3rd-grade
 *   level. Exactly one font family — two is too grown-up.
 * - Theme: light. This is daylight, this is before bed, this is a bedroom
 *   with a lamp on.
 * - Art direction: hand-drawn / illustrated. Paper-grain overlay, wobbling
 *   SVG, mismatched-but-coordinated pastel shapes.
 * - Motion: playful bouncy. Spring physics on hovers, wobbles on the
 *   dinosaur, a gentle bounce on the CTA.
 * - Voice: second-person ("you"), questions that a kid would actually
 *   ask, max 8 words, zero marketing words.
 *
 * ─── Sentence test ────────────────────────────────────────────────────────
 * Could this describe any other product? No. "Parents choose a theme" +
 * "the kid traces words" + "7 pages, ~120 words" is specific to this app
 * and couldn't describe a reading-tracker, a spelling-game, or any
 * generic edtech product.
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

// ── Paper grain overlay (signature element, part 1) ──────────────────────────
function PaperGrain() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[5] opacity-[0.08] mix-blend-multiply"
      aria-hidden
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
      }}
    />
  )
}

// ── Wobbling SVG dinosaur (signature element, part 2) ────────────────────────
function WobblyDino() {
  const reduce = useReducedMotion()
  return (
    <motion.svg
      viewBox="0 0 220 220"
      className="w-56 h-56 md:w-72 md:h-72 text-primary"
      animate={reduce ? undefined : { rotate: [-3, 3, -3] }}
      transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      {/* Body */}
      <path
        d="M40,140 Q45,80 95,75 Q130,72 150,85 Q185,80 195,105 Q205,135 175,150 Q180,170 165,175 Q150,175 145,165 Q110,170 90,160 Q80,180 65,178 Q55,175 58,160 Q40,155 40,140 Z"
        fill="currentColor"
      />
      {/* Spikes */}
      <path d="M95,75 L100,62 L110,72 Z" fill="currentColor" />
      <path d="M115,70 L122,57 L130,70 Z" fill="currentColor" />
      <path d="M135,72 L145,60 L150,72 Z" fill="currentColor" />
      {/* Eye */}
      <circle cx="175" cy="105" r="5" fill="var(--color-background)" />
      <circle cx="176" cy="105" r="2.5" fill="var(--color-foreground)" />
    </motion.svg>
  )
}

// ── Torn mountains (CSS + SVG) ───────────────────────────────────────────────
function TornMountains() {
  return (
    <svg viewBox="0 0 800 220" className="absolute inset-x-0 bottom-0 w-full h-40 md:h-56" preserveAspectRatio="none" aria-hidden>
      <path d="M0,220 L0,110 L80,125 L140,80 L220,115 L300,60 L400,120 L490,85 L560,130 L640,90 L720,140 L800,100 L800,220 Z" className="fill-accent" opacity={0.7} />
      <path d="M0,220 L0,150 L60,140 L130,165 L210,130 L290,160 L370,140 L450,170 L530,145 L620,170 L700,150 L800,175 L800,220 Z" className="fill-primary" opacity={0.6} />
    </svg>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const navigate = useNavigate()
  return (
    <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-10 overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="font-sans font-bold text-2xl text-foreground">Story Box</span>
        <button
          onClick={() => { markLandingSeen(); navigate('/home') }}
          className="font-sans text-sm text-muted-foreground hover:text-foreground"
        >
          Open the app
        </button>
      </div>

      <div className="relative mt-12 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14 }}
            className="font-sans font-extrabold text-5xl md:text-7xl leading-[1.02] text-foreground"
          >
            Read me a <span className="text-primary">story?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-5 font-sans text-lg text-muted-foreground max-w-md"
          >
            Tiny picture books your kid picks the theme for. Seven pages, every night, all yours.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 12 }}
            className="mt-8 flex items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.04, rotate: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { markLandingSeen(); navigate('/home') }}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-sans font-bold text-base shadow-lg"
            >
              Start tonight&rsquo;s story
            </motion.button>
            <span className="font-sans text-sm text-muted-foreground">or tap a dinosaur ↓</span>
          </motion.div>
        </div>

        <div className="relative grid place-items-center">
          <motion.div whileHover={{ scale: 1.03, rotate: 2 }} transition={{ type: 'spring', stiffness: 200, damping: 10 }}>
            <WobblyDino />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 12 }}
            className="absolute top-4 right-2 bg-card rounded-2xl px-4 py-2 border-2 border-foreground shadow-sm"
          >
            <span className="font-sans font-bold text-sm text-foreground">ROARrr.</span>
            <span className="absolute -bottom-2 left-6 w-4 h-4 bg-card border-b-2 border-r-2 border-foreground rotate-45" />
          </motion.div>
        </div>
      </div>

      <TornMountains />
    </section>
  )
}

// ── How it works (3 steps, but NOT 3 identical cards) ────────────────────────
function HowItWorks() {
  const steps = [
    { n: '1', title: 'Pick tonight&rsquo;s thing.', body: 'Dinos. Space. The cat. Whatever they just asked about.', bg: 'bg-primary/25' },
    { n: '2', title: 'We make a little book.', body: 'Seven pages, short words, pictures on every page.', bg: 'bg-accent/35' },
    { n: '3', title: 'You read. They trace.', body: 'Finger on the words. Giggle. Next page.', bg: 'bg-card' },
  ]
  return (
    <section className="relative max-w-6xl mx-auto px-6 py-24">
      <ScrollReveal className="text-center mb-14">
        <h2 className="font-sans font-extrabold text-4xl md:text-5xl text-foreground">How it works</h2>
      </ScrollReveal>
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((s, i) => (
          <ScrollReveal key={s.n} delay={i * 0.1}>
            <motion.div
              whileHover={{ y: -4, rotate: i === 1 ? 1 : -1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className={`${s.bg} rounded-[28px] border-2 border-foreground p-7 h-full`}
              style={{ transform: `rotate(${[-1.5, 1, -0.5][i]}deg)` }}
            >
              <div className="w-12 h-12 rounded-full bg-card border-2 border-foreground grid place-items-center font-sans font-black text-2xl text-foreground">
                {s.n}
              </div>
              <h3 className="mt-4 font-sans font-bold text-2xl text-foreground" dangerouslySetInnerHTML={{ __html: s.title }} />
              <p className="mt-2 font-sans text-muted-foreground">{s.body}</p>
            </motion.div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

// ── A single big number + a sentence ─────────────────────────────────────────
function ProofLine() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-20 text-center">
      <ScrollReveal>
        <p className="font-sans font-extrabold text-7xl md:text-8xl text-primary">7 pages</p>
        <p className="mt-3 font-sans text-muted-foreground text-lg">
          That&rsquo;s it. Then the app goes away and you both go to sleep.
        </p>
      </ScrollReveal>
    </section>
  )
}

// ── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  return (
    <section className="relative py-24">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <ScrollReveal>
          <h2 className="font-sans font-extrabold text-4xl md:text-5xl leading-tight text-foreground">
            What should we read tonight?
          </h2>
          <motion.button
            whileHover={reduce ? undefined : { scale: 1.05 }}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            onClick={() => { markLandingSeen(); navigate('/home') }}
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-foreground text-background font-sans font-bold text-lg shadow-xl"
          >
            Make a book →
          </motion.button>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ── Footer (playful but tiny) ────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-6 py-8 text-center">
      <p className="font-sans text-xs text-muted-foreground">
        Story Box · made for someone&rsquo;s bedroom at 7:30 PM
      </p>
    </footer>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
        <PaperGrain />
        <Hero />
        <HowItWorks />
        <ProofLine />
        <CTA />
        <Footer />
      </div>
    </MotionConfig>
  )
}
