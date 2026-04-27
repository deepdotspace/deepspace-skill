# Footer patterns

3 patterns. Pick ONE. See `pattern-library.md` for shared rules.

---

## FT1 — Minimal mono

When to use: editorial, zine, or manifesto pages where the footer should disappear into the page. One line of meta-info, one link.

```tsx
export function MinimalMonoFooter() {
  return (
    <footer className="border-t-2 border-foreground mt-24">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          TODO: brand · set in TODO: type · TODO: year
        </span>
        <a href="TODO" className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary hover:underline">
          Contribute →
        </a>
      </div>
    </footer>
  )
}
```

---

## FT2 — Column grid

When to use: default SaaS footer. Brand column + 2–4 link columns + a small attribution row.

```tsx
import { Github, Twitter, Mail } from 'lucide-react'

const LINKS = {
  Product: ['Overview', 'Changelog', 'Pricing'],
  Company: ['About', 'Blog', 'Careers'],
  Resources: ['Docs', 'Community', 'Support'],
}
const SOCIALS = [
  { icon: Github, href: 'TODO', label: 'GitHub' },
  { icon: Twitter, href: 'TODO', label: 'Twitter' },
  { icon: Mail, href: 'TODO', label: 'Email' },
]

export function ColumnFooter() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2">
          <span className="font-semibold text-foreground">TODO: brand</span>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">TODO: one-line product description.</p>
          <div className="mt-5 flex items-center gap-2">
            {SOCIALS.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-9 h-9 grid place-items-center rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
        {Object.entries(LINKS).map(([heading, items]) => (
          <div key={heading}>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">{heading}</h4>
            <ul className="space-y-2">
              {items.map(i => (
                <li key={i}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{i}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-muted-foreground flex justify-between">
          <span>&copy; {new Date().getFullYear()} TODO: brand</span>
          <a href="https://deep.space" className="hover:text-foreground">Built with DeepSpace</a>
        </div>
      </div>
    </footer>
  )
}
```

---

## FT3 — Editorial masthead

When to use: magazine/editorial/zine pages. A footer masthead echoing the nav masthead, closing the "it's a printed issue" metaphor.

```tsx
export function EditorialMasthead() {
  return (
    <footer className="mt-28 border-t-2 border-foreground">
      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 items-baseline gap-3">
        <span className="font-serif italic text-lg text-foreground">TODO: masthead</span>
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Issue №TODO · TODO: date
        </p>
        <p className="sm:text-right text-sm text-muted-foreground">
          Edited by <span className="text-foreground">TODO</span>
        </p>
      </div>
    </footer>
  )
}
```
