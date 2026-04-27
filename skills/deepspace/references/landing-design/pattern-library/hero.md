# Hero patterns

5 patterns. Pick ONE that fits your Direction. See `pattern-library.md` for the shared rules + import conventions.

---

## H1 — Split-screen with animated product mockup

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

## H2 — Full-bleed atmospheric

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
          className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
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

## H3 — Bento hero

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

## H4 — Typographic poster

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

## H5 — Live terminal / CLI demo

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
