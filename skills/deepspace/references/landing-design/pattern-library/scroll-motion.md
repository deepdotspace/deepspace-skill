# Scroll & motion patterns

4 patterns. **Skip this section entirely unless your Design Direction calls for scroll choreography.** A quiet/still direction ships without any of these. See `pattern-library.md` for shared rules.

Every pattern here uses `useTransform` from `useScroll` or a continuous animation loop. Both bypass `<MotionConfig reducedMotion="user">` — manual `useReducedMotion()` gates required.

---

## SM1 — Parallax background layer

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

## SM2 — Pinned section with stage progression

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

## SM3 — Scroll progress indicator

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

## SM4 — Word-by-word reveal heading

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
