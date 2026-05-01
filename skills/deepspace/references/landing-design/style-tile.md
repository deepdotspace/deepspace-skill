# Style Tile — concrete commitment options

The Design Direction asks for 6 concrete tokens (color, type pair, theme, art direction, motion, voice). This file gives you the menu for each.

**Don't read linearly.** Jump to the commit you're filling, scan that one table, pick, move on. You will read maybe 30% of this file. Each section ends in a "pick rule" so you're not browsing forever.

---

## 1. Color

**The 60-30-10 rule** (universal). 60% dominant (usually a neutral), 30% secondary, 10% accent (CTAs only). 2-3 core colors total — anything more reads as chaotic.

| Hue family | Reads as | Use for |
|---|---|---|
| Blue | Trust, stability | B2B, finance, healthcare, legal |
| Red / orange | Urgency, appetite | Food, retail, urgency-driven CTAs |
| Green | Growth, health | Wellness, finance/growth, eco |
| Purple | Premium, creative | Beauty, luxury, creative tools |
| Yellow | Optimism, attention | Kids, food, attention-grabbing |
| Black + white | Editorial, premium | Fashion, design agencies, premium SaaS |
| Earth tones | Warm, hand-crafted | Cooking, outdoor, slow brands |

**Saturation matters as much as hue.** Vivid → impulse, younger audiences. Muted/dusty → considered, premium, older audiences. Same hue at different saturation = different brand.

**Hard floor:** WCAG 4.5:1 contrast for normal text, 3:1 for large.

**Cohesion constraint:** The color palette **must** match the app's `@theme` block in `src/styles.css`. The landing page reads the same `--color-background` / `--color-primary` / `--color-foreground` the app does. If you want a different accent for the hero, scope it to the hero component — don't edit the global tokens.

**Pick rule:** name a dominant + accent + saturation level in one sentence. Example: *"Warm cream dominant, deep terracotta accent, muted everywhere except CTAs which go vivid."*

---

## 2. Type pair

**Two fonts max.** Heading carries personality, body carries readability. A third font is only OK if it has a distinct role (e.g. mono for code).

### Reason before you pick

Don't jump straight to a font row. First answer in one sentence: *what does this product feel like, and what does its user value most about reading it?* A meditation app values calm and clarity — pick a font that gets out of the way. A cookbook values warmth and craft — pick a font with serif character. A dev tool values precision — pick a geometric or monospace font. The font should serve the product's tone, not decorate it. **Clarity and elegance always beat distinctiveness for distinctiveness' sake.**

### The clarity + elegance test

Every headline font you pick must pass both:

1. **Clarity** — at a glance, can a stranger read it without effort? If a letterform feels like a puzzle, it fails.
2. **Elegance** — does it feel considered, restrained, and current? If it feels like a costume (period-piece, novelty, or "look at me" display type), it fails.

**Avoid these — they read as gimmicky, not designed:** Syne, Bebas Neue, Anton, Fjalla One, Oswald, Impact, Josefin Sans, Pacifico, Lobster, Comic Sans, and anything labeled "display" with extreme weights, condensed widths, or decorative serifs. Pick one of these only if you can defend the choice in one sentence relative to THIS specific product.

### Headline + body pairings by vibe

| Vibe | Heading options | Body options | Suits |
|---|---|---|---|
| Modern / clean | Inter, Montserrat, DM Sans, Manrope, Space Grotesk | Inter, DM Sans, Source Sans 3 | Productivity, B2B, dashboards, most SaaS |
| Editorial / warm | Fraunces, Playfair Display, Source Serif Pro, Spectral, Lora, DM Serif Display | Source Sans 3, Lato, Inter | Magazines, longform, cooking, wellness |
| Premium / refined | Cormorant, EB Garamond, Fraunces, Playfair Display | Lato, Inter, Karla | Fashion, beauty, agencies, design-conscious products |
| Technical / dev | JetBrains Mono, IBM Plex Mono, Space Mono, IBM Plex Sans | Inter, IBM Plex Sans, DM Sans | Dev tools, APIs, dashboards |
| Friendly / playful | Nunito, Quicksand, Fredoka, Baloo 2 | Nunito, Open Sans, Source Sans 3 | Kids, indie consumer, education (use restraint) |

**Hard don'ts:**
- Don't pair two serifs (they fight).
- Don't use Arial/Helvetica/Times/system-ui as the *headline* font — that's the most-common default-mode tell.
- Inter, Montserrat, and DM Sans are valid headline picks when the product calls for clarity over personality. They are **not** a fallback — they are a deliberate choice you can defend in one sentence.

**Cohesion constraint:** the **body** font should match the app's body font. The **heading** font is your free pick — the landing page can have a more distinctive heading voice than the app itself. Load the heading font via `<link>` in `index.html` or a CSS `@import` in `styles.css`, and reference it via a Tailwind utility class (`font-serif`, `font-display`) or a scoped font-family declaration.

**Pick rule:** name one heading font + one body font, plus one sentence on why this product needs them. Example: *"Fraunces (heading) + Source Sans 3 (body) — the app is a cookbook for slow Sunday cooking, so the heading needs warmth and the body needs to disappear."*

---

## 3. Theme

| Light mode | Dark mode |
|---|---|
| Finance, healthcare, legal, professional services | Premium consumer, gaming, music, creative tools |
| Content-heavy (longform, blogs, docs) | Image/video-heavy (galleries, portfolios, film) |
| Older / conservative audiences | Younger / tech-savvy / design-conscious |
| Trust + reliability brands | Exclusivity + drama + sophistication brands |

**The "dual mode toggle" option** is the safe answer but the laziest — every site that offers both feels less committed than sites that pick a side. Pick a side.

**Cohesion constraint:** match the app's default. The scaffold ships a dark theme by default; if you've already switched the app's `@theme` block to light, the landing follows suit.

**Pick rule:** light or dark, one sentence on why. Example: *"Dark — the product is a music tool used in dim studios at 1am, light mode would be a lie."*

---

## 4. Art direction

Pick ONE archetype. Mixing two is occasionally a deliberate choice and almost always a sign of "couldn't decide."

| Archetype | Look | Use for |
|---|---|---|
| **Modern minimalism** | Generous whitespace, refined type, subtle motion, 1 accent color, character through type and spacing | Productivity, premium SaaS, design-conscious products |
| **Editorial** | Serif headlines, grainy textures, asymmetric grids, magazine-style hierarchy | Content products, longform, lifestyle, hand-crafted |
| **Brutalism / anti-design** | Clashing type, raw grids, exaggerated whitespace, deliberate "ugly" | Creative agencies, indie tools, fashion — never B2B finance |
| **Bento modular** | Asymmetric grid of varying-sized cards, 12-24px gaps, size = hierarchy | Multi-feature SaaS (used by ~67% of top SaaS landings) |
| **Glassmorphism / liquid glass** | Translucent layers, backdrop blur, soft inner shadows | Premium consumer, dashboards, modern productivity |
| **Neo-brutalism** | Hard borders, hard offset shadows (no blur), saturated fills | Indie SaaS, bold marketing, anti-corporate |
| **Kinetic typography** | Oversized animated type, scroll-driven word reveals, type IS the hero | Manifestos, agencies, writing tools |
| **Retro / Y2K / 80s** | Period palettes, grain, gradient mesh, deliberate nostalgia | Gaming, music, niche cultural products |
| **Hand-drawn / illustrated** | Custom illustrations, brushstrokes, paper textures (anti-AI signal) | Education, kids, sustainability, indie consumer |

**Pick rule:** name the archetype + one sentence on what it means for THIS product. Example: *"Editorial — generous Fraunces serif type, paper grain background, asymmetric two-column body, decorative section dividers."*

---

## 5. Motion personality

| Personality | Look | Suits |
|---|---|---|
| **Stillness** | Almost no motion. Single fade-in on load. Nothing animates after | Meditation, editorial, premium content |
| **Subtle drift** | Slow scroll-triggered fades, small staggers, no large translations | Most B2B SaaS — the safe default |
| **Cinematic** | Choreographed page-load reveal, parallax, large hero sequences | Editorial, agencies, story-driven products |
| **Kinetic typography** | Letters animate in, words morph on scroll/hover | Manifesto sites, products where the headline IS the experience |
| **Playful bouncy** | Spring physics, wobbles, rotations, joyful overshoots | Kids, indie consumer, games |
| **Mechanical / technical** | Linear easings, instant snaps, terminal cursors, monospace tickers | Dev tools, technical dashboards |

**Universal rule:** if motion doesn't guide, confirm, or clarify, cut it. Subtle is better than spectacular for ~80% of products.

**Pick rule:** name the personality + one sentence on why. Example: *"Stillness — the product is about the long exhale after a hard conversation; nothing should move."*

---

## 6. Voice — three behaviors, not adjectives

"Friendly," "professional," "modern" are categories, not commitments. Different writers do different things with each. Write **behaviors** instead.

**Examples of concrete voice behaviors:**
- Uses second-person ("you"), never first-person plural ("we")
- Sentences max 12 words
- Always starts with a verb
- No em dashes — periods only
- Contractions yes / contractions no
- No exclamation points anywhere
- Pun policy: dry only / never / freely
- Opens every section with a question

**Reference voices to anchor against:**
- **Linear-ish:** confident, terse, technically literate, no hype
- **Stripe-ish:** calm, precise, infrastructural, restrained excitement
- **Mailchimp-ish:** warm, irreverent, occasionally weird, friendly humor
- **Apple-ish:** aspirational, pared-back, subject-verb
- **Patagonia-ish:** earnest, principled, story-driven, never salesy
- **The New Yorker-ish:** lyrical, literary, generous sentences

**Pick rule:** write three behaviors as a single semicolon-separated line. Example: *"Uses second-person; max 12-word sentences; never starts with 'we'."*

---

## Downstream choices — derived, not committed

These follow naturally from the 6 commits above. You don't need to write them down, but stay consistent throughout the page.

- **Border radius.** Sharp (0px) = formal, brutalist, professional services. Soft (4-8px) = SaaS default. Pillowy (12-24px) = friendly consumer. Pill (`9999px`) = buttons and tags only. Pick ONE radius scale and use it everywhere.
- **Iconography.** Outline (`lucide-react` default) = minimal SaaS. Filled = bold CTAs and decisive moments. Duotone = brand color injection. Pick one source AND one style — never mix Lucide outline with custom filled icons in the same nav.
- **Spacing.** 8px grid system. All spacing values are multiples of 8 (8, 16, 24, 32, 48, 64, 96, 128). Bento grids use 12-24px specifically.
- **Density.** Sparse (premium, editorial), balanced (most SaaS), or dense (dev tools, dashboards). Pick one and apply throughout — every section obeys the same density.
- **Imagery style.** Custom illustration (anti-AI authenticity), 3D sculptural (modern bold), atmospheric photography (mood-driven), code-based React mockups (REQUIRED for product UI — never AI images), abstract geometric (data products), or no imagery at all. Pick what fits the art direction.
- **Surface treatment.** Flat with borders, soft shadows, glass/blur, paper grain, neo-brutalist hard shadows, or gradient mesh. ONE treatment per page.
