# Features patterns

5 patterns. Pick 1 — sometimes 2 if your Direction calls for both a showcase and a list. See `pattern-library.md` for the shared rules + import conventions.

Three identical cards with Icon + Title + Description is the #1 AI-generated layout tell. Every pattern below is designed to break that shape.

---

## F1 — Tabbed interactive showcase

When to use: 3–5 features, each of which needs a visual. One tab list, one preview area. Clicking a tab swaps the preview.

```tsx
import { useState } from 'react'
import { motion, AnimatePresence, cn } from '../components/landing/primitives'

const FEATURES = [
  { id: 'speed', label: 'Speed', title: 'TODO headline.', body: 'TODO one sentence.' },
  { id: 'sync', label: 'Sync', title: 'TODO headline.', body: 'TODO one sentence.' },
  { id: 'share', label: 'Share', title: 'TODO headline.', body: 'TODO one sentence.' },
]

export function TabbedFeatures() {
  const [active, setActive] = useState(FEATURES[0].id)
  const feature = FEATURES.find(f => f.id === active)!
  return (
    <section id="features" className="max-w-5xl mx-auto px-6 py-24">
      <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-[-0.02em]">
        TODO: section headline.
      </h2>
      <div className="mt-10 grid md:grid-cols-[220px_1fr] gap-8">
        <ul className="flex md:flex-col gap-1 border-b md:border-b-0 md:border-r border-border md:pr-6">
          {FEATURES.map(f => (
            <li key={f.id}>
              <button
                onClick={() => setActive(f.id)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  active === f.id
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
        <AnimatePresence mode="wait">
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border bg-card p-8 min-h-[260px]"
          >
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">{feature.label}</span>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">{feature.title}</h3>
            <p className="mt-3 text-muted-foreground max-w-md">{feature.body}</p>
            {/* Add a feature-specific inline visual here — styled divs, SVG, not AI images. */}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
```

---

## F2 — Alternating visual rows

When to use: 2–4 features where each deserves space. Rows alternate left/right so the page has rhythm.

```tsx
import { ScrollReveal } from '../components/landing/primitives'

const ROWS = [
  { label: 'TODO', title: 'TODO headline.', body: 'TODO copy.', flip: false },
  { label: 'TODO', title: 'TODO headline.', body: 'TODO copy.', flip: true },
]

export function AlternatingRows() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-28 space-y-24">
      {ROWS.map((row, i) => (
        <div
          key={i}
          className={`flex flex-col ${row.flip ? 'md:flex-row-reverse' : 'md:flex-row'} gap-10 md:gap-16 items-center`}
        >
          <ScrollReveal direction={row.flip ? 'right' : 'left'} className="flex-1 w-full">
            {/* Replace with a feature-specific inline visual. */}
            <div className="aspect-video rounded-2xl bg-muted border border-border" />
          </ScrollReveal>
          <ScrollReveal direction={row.flip ? 'left' : 'right'} delay={0.1} className="flex-1 max-w-md">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">{row.label}</span>
            <h3 className="mt-2 text-3xl font-semibold text-foreground tracking-[-0.01em]">{row.title}</h3>
            <p className="mt-4 text-muted-foreground leading-relaxed">{row.body}</p>
          </ScrollReveal>
        </div>
      ))}
    </section>
  )
}
```

---

## F3 — Bento feature grid

When to use: 4–7 features, several of which fit in smaller tiles. Size = hierarchy. The largest tile is the primary feature.

```tsx
import { ScrollReveal, cn } from '../components/landing/primitives'

const TILES = [
  { span: 'col-span-6 md:col-span-4 md:row-span-2', title: 'TODO primary.', body: 'TODO body.' },
  { span: 'col-span-3 md:col-span-2', title: 'TODO b.', body: 'TODO body.' },
  { span: 'col-span-3 md:col-span-2', title: 'TODO c.', body: 'TODO body.' },
  { span: 'col-span-6 md:col-span-2', title: 'TODO d.', body: 'TODO body.' },
  { span: 'col-span-6 md:col-span-2', title: 'TODO e.', body: 'TODO body.' },
]

export function BentoFeatures() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-24">
      <ScrollReveal className="mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-[-0.02em]">
          TODO: section headline.
        </h2>
      </ScrollReveal>
      <div className="grid grid-cols-6 auto-rows-[minmax(140px,_auto)] gap-3 md:gap-4">
        {TILES.map((t, i) => (
          <ScrollReveal key={i} delay={0.05 * i} className={cn(t.span)}>
            <div className="h-full rounded-2xl bg-card border border-border p-6 flex flex-col justify-end">
              <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.body}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
```

---

## F4 — Single scrolling showcase

When to use: one feature is so much more important than the rest that it deserves the whole section. Long-form, editorial, one visual + a few supporting beats.

```tsx
import { ScrollReveal } from '../components/landing/primitives'

export function SingleShowcase() {
  return (
    <section id="features" className="max-w-4xl mx-auto px-6 py-28">
      <ScrollReveal>
        <span className="text-xs font-mono uppercase tracking-[0.25em] text-primary">TODO: label</span>
        <h2 className="mt-3 text-4xl md:text-5xl font-semibold tracking-[-0.02em] text-foreground">
          TODO: one-sentence feature claim.
        </h2>
      </ScrollReveal>
      <ScrollReveal delay={0.15} className="mt-10">
        {/* Replace with an inline React visual that demonstrates the feature. */}
        <div className="aspect-[16/9] rounded-2xl bg-muted border border-border" />
      </ScrollReveal>
      <ScrollReveal delay={0.25} className="mt-12 grid md:grid-cols-3 gap-8">
        {[
          { h: 'TODO: beat 1', b: 'TODO one sentence.' },
          { h: 'TODO: beat 2', b: 'TODO one sentence.' },
          { h: 'TODO: beat 3', b: 'TODO one sentence.' },
        ].map(({ h, b }) => (
          <div key={h}>
            <h3 className="text-base font-semibold text-foreground">{h}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{b}</p>
          </div>
        ))}
      </ScrollReveal>
    </section>
  )
}
```

**Direction → choice:** F4 suits editorial, minimalist, and premium directions where restraint is the aesthetic. Avoid if your Direction calls for "show the whole product at a glance" — use F3 instead.

---

## F5 — Code-block feature list

When to use: dev tools where each feature is a code snippet. Title + description on one side, code sample on the other. The code IS the demo.

```tsx
import { ScrollReveal } from '../components/landing/primitives'

const CODE = [
  {
    label: 'TODO',
    title: 'TODO headline.',
    body: 'TODO one-sentence claim.',
    code: `const x = TODO()\nawait x.run()`,
  },
  {
    label: 'TODO',
    title: 'TODO headline.',
    body: 'TODO one-sentence claim.',
    code: `client.on('event', handler)\nclient.emit('event', payload)`,
  },
]

export function CodeFeatures() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-24 space-y-20">
      {CODE.map((row, i) => (
        <ScrollReveal key={i} className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">{row.label}</span>
            <h3 className="mt-2 text-2xl md:text-3xl font-semibold text-foreground">{row.title}</h3>
            <p className="mt-3 text-muted-foreground">{row.body}</p>
          </div>
          <pre className="rounded-xl border border-border bg-card p-5 overflow-x-auto text-sm font-mono text-foreground leading-relaxed">
            <code>{row.code}</code>
          </pre>
        </ScrollReveal>
      ))}
    </section>
  )
}
```
