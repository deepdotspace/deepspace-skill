# Social-proof patterns

4 patterns. Pick AT MOST 1 — only if you actually have real social proof. Fake logos and fake testimonials are worse than no social proof at all. See `pattern-library.md` for shared rules.

---

## S1 — Logo row + single big stat

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

## S2 — Single pull quote

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

## S3 — Metric trio (animated counters)

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

## S4 — Marquee carousel

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
