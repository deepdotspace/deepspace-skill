# UI/UX Polish Guide

A DeepSpace app is judged on three things the first time someone opens it: the home page, the theme, and the UI primitives it picks. The scaffold ships working defaults for all three — they are placeholders, not finished states. Do not ship them untouched.

**Load this reference whenever you:**
- Build or edit the home page / landing / first-run state.
- The user asks to customize look, feel, theme, colors, or brand.
- You are about to reach for `<select>`, `window.confirm`, `window.alert`, or `window.prompt` — stop and read §3 instead.
- The user says the app "feels generic", "boring", "default", "plain", or "needs polish".
- You are wiring up notifications, confirmations, menus, empty states, or loading states for the first time in an app.

---

## 1. Home Page / First-Run State

The scaffolded `src/pages/home.tsx` ships with placeholder content that must be replaced before shipping:

- H1 reading "Welcome" or "Welcome, {name}"
- Subtext "Your DeepSpace app is running."
- A "Get started" card listing `src/schemas.ts` / `src/pages/` / `src/actions/`
- A "Resources" card linking to docs.deep.space / deep.space/examples

Grep for any of those strings (especially `"Your DeepSpace app is running"`, `"Get started"`, `docs.deep.space`) in the app — if any still exist at the end of the session, the home page is not done.

**Minimum bar for the replacement home page:**
- A real H1 that names the app. Not "Welcome", not "Welcome to DeepSpace", not the raw app id, not "Home".
- A one-sentence description of what the app actually does, under the H1.
- A primary action button for the most common flow (create, browse, search) visible above the fold.
- For unauthenticated users: a meaningful preview or a clear Sign In CTA — never an empty page behind an `AuthOverlay`-only gate with nothing to read first.
- For first-time signed-in users with no data yet: a preset `EmptyState` variant (see §3) — not a blank page and not a bare "No items" string.

A good home page in < 60 lines of JSX using `Card`, `CardGrid`, `EmptyState`, and `Button` is normal.

---

## 2. Theme — Pick a Preset, or Customize One

The scaffold ships **15 ready-to-use theme presets** as `[data-theme="<id>"]` CSS blocks in `src/themes.css`, with a typed catalog in `src/themes.ts`. The active theme is set on `<html data-theme="...">` in `index.html`. Switching themes is one attribute change; no JS, no FOUC. **This is the retheming surface for 95% of cases — not `DeepSpaceThemeProvider`.**

### The 15 presets

**Dark** — `slate` (default; cool gray + indigo), `ink` (warm-deep + violet), `aurora` (cyan on near-black; AI/cyber), `midnight` (deep navy + sky-blue; data/finance), `forest` (deep green + sage), `ember` (near-black + amber; cozy), `graphite` (pure monochrome), `noir` (true black + crimson; dramatic).

**Light** — `linen` (warm off-white + sky-blue; docs/blogs), `mist` (cool pale slate; calm/wellness), `sand` (cream + terracotta; lifestyle), `bloom` (pale rose + pink), `paper` (white + near-black; typography/reading), `lavender` (pale purple + mauve), `citrus` (cream + lime; energetic).

### The fast path (90% of apps)

1. **Pick a preset that fits the app's domain.** The 15 presets above cover most app concepts — read their one-line descriptions and pick the one whose feel matches the product. **Don't ship `slate`** (the scaffold default — every untouched scaffold looks the same). If the user hasn't specified a palette, pick one and tell them in one line: "Picked `<id>` — <one-phrase rationale>." Don't ask for hex codes; don't explain reasoning unless asked. **Vary your picks across apps** — don't reach for the same preset every time. The 15 presets exist so different apps look different.

   Worked examples (illustrative, not prescriptive — match the actual product):

   | App concept | Reasonable pick | Why |
   |---|---|---|
   | Data dashboard / finance / analytics | `midnight` | deep navy + sky-blue, reads as data-dense |
   | Cooking / recipes / lifestyle | `sand` | cream + terracotta, warm and tactile |
   | AI / dev tool / cyber | `aurora` | cyan on near-black, technical |
   | Wellness / meditation / journaling | `mist` | cool pale slate, calm |
   | Reader / docs / blog | `paper` | white + near-black, typography-first |
   | Kids / playful / education | `citrus` or `bloom` | high-energy or soft-rose, friendly |
   | Editorial / agency / premium | `noir` or `linen` | dramatic or warm off-white |
   | Outdoor / eco / health | `forest` | deep green + sage |

   These are starting points — read the full preset list and pick what fits *this* app, not what fits the table category.

2. **Edit `index.html`** — change `<html data-theme="slate">` to `<html data-theme="<your-id>">`.
3. **Update `<title>`** in `index.html` and replace the favicon. The defaults say "DeepSpace App".
4. **Add a wordmark** to `Navigation.tsx` if the app has a distinct identity — plain text in a distinctive font is enough (`font-serif`, `tracking-tight`, larger size). **Don't rewrite the rest of `Navigation.tsx`** — sign-in (`AuthOverlay` modal), sign-out (`signOut()` in avatar dropdown), user avatar, role badge, mobile menu, and nav links are already wired to the SDK and `src/nav.ts`. To add a nav item, append to `src/nav.ts`; Navigation picks it up automatically.

That's it. Move on to features.

### The customize path (preset close, but not exact)

If a preset is close but the accent or background needs tuning:

1. Set `data-theme="<closest-preset>"` in `index.html`.
2. Open `src/themes.css`, find the matching `[data-theme="<id>"] { ... }` block, override the tokens you want changed (`--color-primary`, `--color-background`, `--color-card`, `--color-accent`, `--color-ring`, etc.). Light themes also include `color-scheme: light` — keep it.
3. Optional: if you're tuning the **default** (`slate`), edit the `@theme { ... }` block in `src/styles.css` instead — that block holds slate's values and is the inherited baseline.

A single token swap is not enough; if the result still looks like the preset, swap at least: background, foreground, card, primary, secondary, accent, ring, plus the `--shadow-card*` tokens for cohesion.

### The build-from-scratch path (rare)

If none of the presets fit, append a new block to `src/themes.css` (`[data-theme="my-id"] { ... }` with the full token set — copy any existing preset as a template), add an entry to the `THEMES` array in `src/themes.ts` for type safety, and set `data-theme="my-id"` in `index.html`. The themes.ts file's header has these instructions inline.

### Backward-compat aliases

The slate `@theme` block in `src/styles.css` includes a chunk of legacy aliases (`--color-surface`, `--color-primary-hover`, `--color-primary-muted`, `--color-primary-border`, etc.) some older components still read. They derive from the modern tokens via `var(...)`, so once the modern tokens are correct (preset or customized), the aliases follow automatically. Only touch them if you find a component still reading a literal value that's drifted.

### When to use `DeepSpaceThemeProvider` / `applyDeepSpaceTheme` instead

These are exported from `deepspace` (the root package — there is no `deepspace/theme` subpath) and drive `--theme-*` CSS variables consumed by cross-app / deployed DeepSpace components (pills, directory panels, mini-apps). They read from `--color-*` by default (`readThemeFromDOM`), so the preset / `@theme` setup is usually enough and they just follow. Reach for them explicitly only when embedding DeepSpace surfaces on a deployed site or mini-app that needs a different theme from the main app.

### UI dark/light mode

Light themes set `color-scheme: light` inside the preset block, so native form controls (calendar icons, scrollbars) match. The SDK also reads `data-ui-theme="dark" | "light"` on `<html>` to switch between `UI_TOKENS_DARK` and `UI_TOKENS_LIGHT` (see `applyUIThemeTokens`) — set this if the app supports a light/dark toggle distinct from the theme picker.

---

## 2a. No Emojis in UI Chrome

**Do not put emojis in page titles, H1s, nav items, buttons, empty states, card headers, or anywhere else the app itself renders text.** Emoji-as-icon (🛒 Shared Grocery, 📊 Pulse, 📅 Calendar) looks amateurish and substitutes for actual branding. It's a tell that the agent skipped design.

Allowed emoji contexts:
- **User-authored content** — messages, comments, posts. Users type what they type.
- **Message reactions** — the reaction picker itself (👍 🎉 ❤️ etc. as the selectable set).
- **The user explicitly asks for emojis** ("add a grocery emoji to the header").

Everywhere else, use an `lucide-react` icon (already a scaffold dep) or a text-only treatment. Good wordmarks are plain text in a distinctive font — `font-serif tracking-tight` or similar — not an emoji next to a heading.

## 3. UI Primitives — Use the Scaffolded Shadcn/UI Kit, Never Browser Defaults

The scaffold ships a full shadcn/ui-based kit in `src/components/ui/` (index at `src/components/ui/index.ts`). Use it. Browser-default controls ignore the theme tokens, render as native widgets on macOS/iOS, and break visual consistency.

| Use case | Use this | Don't use |
|---|---|---|
| Select one of N options | `Select` + `SelectTrigger`/`SelectContent`/`SelectItem` | `<select>` / `<option>` |
| Menu / overflow / "…" actions | `DropdownMenu` + `DropdownMenuTrigger`/`Content`/`Item` (+ `CheckboxItem`, `RadioItem`, `Separator`, `Sub`/`SubTrigger`/`SubContent`) | hacked `<select>`, raw `<ul>` dropdown |
| Confirm ("Are you sure?") | **`ConfirmModal`** (scaffold's dedicated confirmation primitive) or `Dialog` + `DialogFooter` | `window.confirm()` |
| Modal dialog | `Modal` or `Dialog` (+ `DialogHeader`/`Footer`/`Title`/`Description`) | positioned `<div>` hacks |
| Alerts / info banners | `Alert` + `AlertTitle` + `AlertDescription` | `window.alert()` |
| Prompt for a string | `Dialog` with an `Input` inside | `window.prompt()` |
| Success/error toast feedback | `useToast` (from `../components/ui`) — `success()` / `error()` / `warning()` / `info()` | `alert()`, inline console text, silent mutations |
| Empty lists / no data | `EmptyItems` / `EmptySearch` / `EmptyDocuments` / `EmptyProjects` / `EmptyTeam` / `EmptyError` (preset variants) or the base `EmptyState` | raw "No items" text |
| Initial loading | `Skeleton` / `SkeletonText` / `SkeletonCard` / `SkeletonList` / `SkeletonTable` / `SkeletonAvatar` | blank screens |
| Inline spinner / overlay | `LoadingSpinner` / `LoadingOverlay` | hand-rolled CSS spinners |
| Form fields | `Input`, `Textarea`, `Label`, `Checkbox`, `Switch` | raw HTML equivalents |
| Search box | `SearchInput` (wraps `Input` with search icon + clear) | raw `<input type="search">` |
| Tabs | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | hand-rolled tab buttons |
| Tables | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` | raw `<table>` |
| Card layout | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | raw `<div className="rounded-lg border">` |
| Card grids | `CardGrid`, `GridCard` | ad-hoc flex/grid |
| Avatars | `Avatar`, `AvatarImage`, `AvatarFallback` | raw `<img>` |
| Tooltips | `Tooltip`, `TooltipTrigger`, `TooltipContent` (wrap tree in `TooltipProvider` once) | `title=""` attribute |
| Separators | `Separator` | raw `<hr>` or border divs |
| Status pills | `Badge` + `badgeVariants` | hand-rolled rounded divs |
| Progress | `Progress` | raw `<progress>` |

**Critical import rule:** import primitives from `../components/ui` (the scaffold's local path), **not from `deepspace`**. The scaffold's `_app.tsx` wraps the tree in the **local** `ToastProvider` — using the SDK's `useToast` will throw `useToast must be used within ToastProvider` at runtime. The same shadowing applies to any primitive the scaffold has locally. Always check `_app.tsx` before picking an import source.

**Why the shadowing happens:** the scaffold's `src/components/ui/` ships its own copy of the UI primitives, with its own React contexts (`ToastContext`, `TooltipProvider`, etc.). A hook only finds a Provider from the *same* module instance, so mixing `useToast` from `deepspace` with the scaffold's `ToastProvider` fails with `useToast must be used within ToastProvider` even though the APIs look identical. Pick one source per primitive — the scaffold's local copy is the default and matches what `_app.tsx` wraps the tree in.

**`useToast` is the default feedback channel** for any mutation. `const { success, error, warning, info } = useToast()` then:
- `success('Saved', 'Your changes have been saved.')` after `create` / `put` / `remove` resolves.
- `error('Failed to save', err.message)` in the `catch`.
- No silent mutations — the user should always see confirmation.

---

## 3a. Prop Shapes You'll Otherwise Forget

**`Button`** — has a built-in `loading` prop. Do not hand-roll `{pending && <Spinner />}` + `disabled={pending}`:
```tsx
<Button loading={creating} onClick={handleCreate}>Create</Button>
// variants: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
// sizes:    'default' | 'sm' | 'lg' | 'icon'
```

**`ConfirmModal`** — dedicated confirmation; use it instead of composing `Dialog` + `DialogFooter` + two `Button`s:
```tsx
<ConfirmModal
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleDelete}
  title={`Delete task '${task.title}'?`}
  description="This cannot be undone."
  confirmText="Delete"        // default 'Confirm'
  cancelText="Cancel"         // default 'Cancel'
  variant="destructive"       // default 'destructive' — pass 'default' for non-destructive confirms
  loading={deleting}
/>
```

**`EmptyState`** — the base; the preset variants (`EmptyItems`, `EmptySearch`, etc.) wrap this with domain-appropriate icons/copy:
```tsx
<EmptyState
  icon={<Inbox className="w-6 h-6" />}
  title="No tasks yet"
  description="Create your first task to get started."
  action={{ label: 'New task', onClick: openCreate }}
  secondaryAction={{ label: 'Import', onClick: openImport }}  // optional
/>
```

**`AuthOverlay`** — render without `onClose` and gate with `!isSignedIn`. Returns `null` automatically when signed in or still loading:
```tsx
<AuthOverlay providers={['google', 'github']} />  // providers optional — defaults to both
```

**`useToast`** — four-level API, plus a generic `toast({ type, title, description, duration })`:
```tsx
const { success, error, warning, info, toast, dismiss, dismissAll } = useToast()
success('Saved', 'Changes saved successfully.')
error('Upload failed', err.message)
```

---

## 4. Interaction Polish (free wins)

These are cheap to add and dramatically change how finished an app feels.

- **Every async action** (mutate, upload, send): disable the trigger + render `LoadingSpinner` inside the button while pending. Use optimistic UI where the collection supports it.
- **Every destructive action** (delete, remove, leave): `ConfirmModal` that names the item in the body ("Delete task 'Buy milk'?"), not a generic "Are you sure?".
- **Every mutation**: fire `useToast` on success and error.
- **Every form**: inline validation next to the field, not a global banner. Use `Label` + `Input` + a small `<p>` with the error.
- **Every list during initial load**: a matching `Skeleton*` variant (`SkeletonList`, `SkeletonTable`, `SkeletonCard`). Never a blank screen with just "Loading…".
- **Full-screen overlays** (initial auth check, first-load): `LoadingOverlay`.
- **Hover/focus states** on every clickable element — the primitives handle this; raw `<div onClick>` does not. The scaffold also ships `*:focus-visible` outlines in `styles.css` — keep them.
- **Keyboard accessibility**: `Dialog`, `DropdownMenu`, `Select` all handle Esc/arrow keys + focus trapping; roll-your-own usually doesn't.

---

## 5. Verify With a Smoke Test

After customizing home, theme, and primitives, extend `smoke.spec.ts`:
- Home page renders the **real** H1 (assert the app-specific title, not "Welcome" or "Welcome to DeepSpace").
- "Your DeepSpace app is running." and "Get started" placeholder text are **not** in the DOM (assert absence).
- Primary CTA is visible and clickable.
- At least one real primitive opens on interaction (e.g., clicking the user avatar opens the `DropdownMenu`; clicking Delete opens the `ConfirmModal`).
- Page `<title>` is app-specific, not "DeepSpace".
- Spot-check a mutation and assert a toast appears.

If the smoke test passes but the app still looks unfinished, it is almost always one of: default `@theme` block untouched, missing empty states, or a `<select>` / `window.confirm` / `window.alert` / `window.prompt` still hiding somewhere. Before declaring done, grep the whole `src/` tree for:

```
<select  |  window.confirm  |  window.alert  |  window.prompt
"Welcome, "  |  "Your DeepSpace app is running"  |  "docs.deep.space"
```

Any hit means the app is not ready.
