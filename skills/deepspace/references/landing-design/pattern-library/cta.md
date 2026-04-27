# CTA patterns

3 patterns. Pick ONE. See `pattern-library.md` for shared rules + import conventions.

---

## C1 — Contrast band (full-width)

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

## C2 — Centered glow

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

## C3 — Asymmetric full-bleed

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
