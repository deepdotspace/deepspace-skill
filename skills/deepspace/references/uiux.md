# UI/UX Polish Guide

A DeepSpace app is judged on three things the first time someone opens it: the home page, the theme, and the UI primitives it picks.

**The scaffold shell is a placeholder, not a design.** The home page, navigation bar, and theme that ship with a fresh scaffold are deliberately bare scaffolding — there is no "house style" to extend or imitate. Design the app's own look (layout, theme tokens, typography, density) from the product's point of view; for landing/home pages, work from `references/landing-design/` (design directions, pattern library, examples). Never reuse the placeholder page structure as the app's design.

**Load this reference whenever you:**
- Build or edit the home page / landing / first-run state.
- The user asks to customize look, feel, theme, colors, or brand.
- You are about to reach for `<select>`, `window.confirm`, `window.alert`, or `window.prompt` — stop and read §3 instead.
- The user says the app "feels generic", "boring", "default", "plain", or "needs polish".
- You are wiring up notifications, confirmations, menus, empty states, or loading states for the first time in an app.

---

## 1. Home Page / First-Run State

The scaffold ships **two** front-of-house pages, and this section is about the second one:

- `src/pages/index.tsx` — the **static landing** at `/`. It lives at the top level of `src/pages/`, so no DeepSpace providers mount: no auth fetch, no WebSocket, and no data hooks. It's the marketing front door; design it with `references/landing-design.md`, not this procedure.
- `src/pages/(app)/home.tsx` — the **dynamic home** at `/home` (`(app)` is a route group — it doesn't appear in the URL). It sits inside the provider boundary, so `useAuth`/`useQuery` work, signed-out included (`allowAnonymous`). **This is the page the procedure below targets.** If the product wants the live surface at `/` instead of a marketing page, move the home page to the top slot only by keeping it under `(app)/` (e.g. `(app)/index.tsx` after removing the static landing) — a top-level `index.tsx` can't call data hooks.

The scaffolded `src/pages/(app)/home.tsx` is an explicit stub: the app name plus "This is a placeholder page. Replace `src/pages/(app)/home.tsx`…". It must be replaced before shipping — and it is a *stub to delete*, not a layout to grow.

Grep for `placeholder page` in `src/` — if it still exists at the end of the session, the home page is not done.

**Build the home page with this decision procedure — in order, no skipping:**

1. **Name the app's primary surface.** The thing users open the app to see: the board, the list, the grid, the feed, the document. That surface *is* the home page. A poster *describing* the app is not a home page.

2. **Pick the home skeleton by what the product is, and declare it.** The skeletons:
   - `product-preview-first` — the real primary surface, rendered with sample/preview data for visitors
   - `data-forward` — a dashboard/grid of live numbers, statuses, streaks above the fold
   - `search-first` — a search bar + the list, single column
   - `split-hero` — one-line pitch on one side, the live product surface on the other
   - `single-column-narrative` — for content/reading apps

   Write the declaration as the **first line of `src/pages/(app)/home.tsx`, before any code**, then make the JSX agree with it:

   ```tsx
   /* home pattern: data-forward — today's habit grid above the fold */
   ```

   The comment is required — the §5 pre-deploy grep checks for it. Pick by what the product *is*, not by what is easiest to render. Two apps declaring the same skeleton with the same composition means one of them is wrong — change it. For section-level detail (heroes, CTAs, social proof, scroll motion) open `references/landing-design/pattern-library/`.

3. **Signed-in home = the primary surface**, above the fold, with the user's real data.

4. **Signed-out home = the same surface in preview form** — sample data, read-only or blurred, with an inline sign-in CTA. Never an empty page behind an `AuthOverlay`-only gate, and **never a poster page** (icon + H1 + tagline + button with no product visible). If a visitor can't tell what the app looks like inside, the home page failed.

5. **Content bar** (applies to every skeleton): a real H1 naming the app (not "Welcome", not the raw app id, not "Home"); a one-sentence description of what it does; the primary action visible above the fold; and for signed-in users with no data yet, an `EmptyState` with icon, copy, and an action (§3a) — never a bare "No items" string.

Known AI tells to avoid: "centered hero + three icon-title-description cards" (see `landing-design/pattern-library/features.md`) and its minimal cousin "centered icon badge + H1 + tagline + single CTA." Both read as template output regardless of theme.

---

## 2. Theme — Create One for the App

The scaffold ships **two placeholder themes**: `slate` (neutral dark — the default values in the `@theme` block of `src/styles.css`) and `paper` (a light example block in `src/themes.css` that demonstrates the full token contract including `color-scheme: light`). They exist so the scaffold renders; **neither is a design choice. Create the app's own theme before first deploy — don't ship `slate` or `paper`.**

Themes are `[data-theme="<id>"]` CSS blocks overriding the shadcn tokens, activated via `<html data-theme="...">` in `index.html`. Switching is one attribute change; no JS, no FOUC. **This is the retheming surface for 95% of cases — not `DeepSpaceThemeProvider`.**

### The standard path

1. **Design a palette for the product** — background, foreground, card, primary (+foreground), secondary, muted, accent, border, ring. Match the product's feel (calm/energetic, warm/cool, light/dark). Vary across apps: different products should look different. If the user hasn't specified a palette, pick one and tell them in one line: "Created `<id>` — <one-phrase rationale>." Don't ask for hex codes.
2. **Add a theme block** — copy the `paper` block in `src/themes.css`, rename the selector, set your colors. Light themes must keep `color-scheme: light;` so native form controls match.
3. **Register it** — add an entry to the `THEMES` array in `src/themes.ts` (type safety + catalog), then set `data-theme="<your-id>"` in `index.html`.
4. **Shape** — the primitives take their corner rounding from `--radius` (default `0.5rem`). Sharp/technical product → shrink it; soft/friendly → grow it. One variable, whole-app effect.
5. **Update `<title>`** in `index.html` and replace the favicon. The defaults say "DeepSpace App".
6. **Wordmark & nav** — the scaffold `Navigation.tsx` is a minimal placeholder bar. Restyle or rebuild it to fit the app (a plain-text wordmark with a deliberate treatment is enough — §2a), but keep its wired mechanisms: sign-in (`AuthOverlay`), sign-out, and links driven by `src/nav.ts` (append there to add items). **Keep the `data-testid` hooks (`app-navigation`, `nav-sign-in-button`, `nav-user-name`)** — the shipped tests assert on them.

A single token swap is not enough; a theme that still looks like `slate` with one changed accent is not a theme. Set at least: background, foreground, card, primary, secondary, accent, ring.

If you're tuning the **default** rather than adding a block, edit the `@theme { ... }` block in `src/styles.css` — that holds slate's values and is the inherited baseline.

### Shadows caveat

Tailwind v4's `@theme` bakes baseline shadow values into compiled utilities, so runtime `[data-theme]` overrides of `--shadow-*` tokens can't fully cancel them. For per-theme shadows on your own components, use literal arbitrary classes (`shadow-[0_2px_8px_0_rgba(0,0,0,0.08)]`) or scope a small utility under your `[data-theme]` block, and verify in the browser that the shadow changes when you switch themes.

### Backward-compat aliases

The slate `@theme` block includes legacy aliases (`--color-surface`, `--color-primary-hover`, etc.) some older components read. They derive from the modern tokens via `var(...)`, so once the modern tokens are set, the aliases follow. Only touch them if a component reads a drifted literal value.

### When to use `DeepSpaceThemeProvider` / `applyDeepSpaceTheme` instead

These are exported from `deepspace` (the root package — there is no `deepspace/theme` subpath) and drive `--theme-*` CSS variables consumed by cross-app / deployed DeepSpace components (pills, directory panels, mini-apps). They read from `--color-*` by default (`readThemeFromDOM`), so the token setup is usually enough and they just follow. Reach for them explicitly only when embedding DeepSpace surfaces on a deployed site or mini-app that needs a different theme from the main app.

### UI dark/light mode

Light themes set `color-scheme: light` inside the theme block, so native form controls (calendar icons, scrollbars) match. The SDK also reads `data-ui-theme="dark" | "light"` on `<html>` to switch between `UI_TOKENS_DARK` and `UI_TOKENS_LIGHT` (see `applyUIThemeTokens`) — set this if the app supports a light/dark toggle distinct from the theme picker.

---

## 2a. No Emojis in UI Chrome

**Do not put emojis in page titles, H1s, nav items, buttons, empty states, card headers, or anywhere else the app itself renders text.** Emoji-as-icon (🛒 Shared Grocery, 📊 Pulse, 📅 Calendar) looks amateurish and substitutes for actual branding. It's a tell that the agent skipped design.

Allowed emoji contexts:
- **User-authored content** — messages, comments, posts. Users type what they type.
- **Message reactions** — the reaction picker itself (👍 🎉 ❤️ etc. as the selectable set).
- **The user explicitly asks for emojis** ("add a grocery emoji to the header").

Everywhere else, use a `lucide-react` icon (already a scaffold dep) or a text-only treatment. Good wordmarks are plain text with a deliberate treatment — not an emoji next to a heading. Design the treatment by choosing along four dimensions — **font family, weight, letter-spacing, case** — to match the theme's personality. Any consistent choice is fine; derive it from *this* app's character, not from a previous app or an example.

## 3. UI Primitives — Use the Scaffolded Base UI Kit, Never Browser Defaults

The scaffold ships a copy-paste primitives kit in `src/components/ui/` (index at `src/components/ui/index.ts`), built on **Base UI** (`@base-ui/react` — headless, from the Radix/Floating-UI/MUI team) and styled entirely with the app's semantic theme tokens. The components are the app's own files — restyle or extend them freely; their *look* follows the theme tokens automatically. Overlay positioning, focus trapping, select label rendering, and nested-dialog stacking are already correct — do not hand-roll replacements, and never use browser-default controls (they ignore theme tokens and render as native widgets).

| Use case | Use this | Don't use |
|---|---|---|
| Select one of N options | `Select` + `SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` | `<select>` / `<option>` |
| Menu / overflow / "…" actions | `DropdownMenu` + `Trigger`/`Content`/`Item` (+ `CheckboxItem`, `RadioItem`, `Separator`, `Sub`) | hacked `<select>`, raw `<ul>` dropdown |
| Confirm ("Are you sure?") | **`ConfirmModal`** (dedicated confirmation primitive) | `window.confirm()` |
| Modal dialog | `Modal` (simple controlled: `open`/`onClose`, `Modal.Header/Body/Footer`) or the `Dialog` family (`DialogTrigger`/`DialogContent`/… for triggers, nesting, custom composition) | positioned `<div>` hacks |
| Prompt for a string | `Modal` (or `Dialog`) with an `Input` inside | `window.prompt()` |
| Alerts / info banners | `useToast` for transient; inline token-styled banner (`border border-border bg-card` + lucide icon) for persistent | `window.alert()` |
| Success/error toast feedback | `useToast` (from `../components/ui`) — `success()` / `error()` / `warning()` / `info()` | `alert()`, inline console text, silent mutations |
| Empty lists / no data | `EmptyState` (icon + title + description + action) | raw "No items" text |
| Loading placeholders | `animate-pulse` divs on `bg-muted` sized like the content; `Button loading` for pending actions | blank screens, hand-rolled CSS spinners |
| Form fields | `Input`, `Textarea`, `Label`, `Checkbox`, `Switch` | raw HTML equivalents |
| Search box | `SearchInput` (wraps `Input` with search icon + clear) | raw `<input type="search">` |
| Tabs | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | hand-rolled tab buttons |
| Anchored popups | `Popover`, `PopoverTrigger`, `PopoverContent` | absolutely-positioned divs |
| Tooltips | `Tooltip`, `TooltipTrigger`, `TooltipContent` (wrap tree in `TooltipProvider` once) | `title=""` attribute |
| Avatars | `Avatar`, `AvatarImage`, `AvatarFallback` | raw `<img>` |
| Status pills | `Badge` | hand-rolled rounded divs |
| Cards / tables / separators | No primitive — token-styled elements (`rounded-lg border border-border bg-card p-4`; styled `<table>` with `border-border` rows; `border-t border-border`) | hardcoded colors |

**Critical import rule:** import primitives from `../components/ui` (the scaffold's local path), **not from `deepspace`**. The scaffold's `_app.tsx` wraps the tree in the **local** `ToastProvider` — using the SDK's `useToast` will throw `useToast must be used within ToastProvider` at runtime. The same shadowing applies to any primitive the scaffold has locally. Always check `_app.tsx` before picking an import source.

**Why the shadowing happens:** the scaffold's `src/components/ui/` ships its own copy of the UI primitives, with its own React contexts. A hook only finds a Provider from the *same* module instance, so mixing `useToast` from `deepspace` with the scaffold's `ToastProvider` fails even though the APIs look identical. Pick one source per primitive — the scaffold's local copy is the default and matches what `_app.tsx` wraps the tree in.

**`useToast` is the default feedback channel** for any mutation. `const { success, error, warning, info } = useToast()` then:
- `success('Saved', 'Your changes have been saved.')` after `create` / `put` / `remove` resolves.
- `error('Failed to save', err.message)` in the `catch`.
- No silent mutations — the user should always see confirmation.

### Base UI gotchas (already handled in the kit — don't undo them)

- **Custom trigger elements use the `render` prop, not `asChild`:** `<DialogTrigger render={<Button>Open</Button>} />`. The kit's `Button` is a native `<button>` and works as a `render` target.
- **`SelectValue` label rendering** — the kit's `SelectContent` derives an items map from its `SelectItem` children so the trigger shows the *label* (not the raw value) even before the popup ever opens. Keep options as `SelectItem` children.
- **Nested dialogs** — the kit passes `forceRender` on backdrops so a modal-in-modal deepens the scrim. Opening a `Dialog` from inside a `Modal` just works.
- **Tabs active state** styles via `data-active` (not `data-selected`).
- **Open/close animations** depend on the custom `animate-in`/`animate-out` utilities in `src/styles.css` (with `animation-fill-mode: both`). Don't remove that block; components animate via `data-[open]`/`data-[closed]`.

---

## 3a. Prop Shapes You'll Otherwise Forget

**`Button`** — has a built-in `loading` prop. Do not hand-roll `{pending && <Spinner />}` + `disabled={pending}`:
```tsx
<Button loading={creating} onClick={handleCreate}>Create</Button>
// variants: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
// sizes:    'default' | 'sm' | 'lg' | 'icon'
```

**`ConfirmModal`** — dedicated confirmation; use it instead of composing a dialog + footer + two buttons:
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

**`EmptyState`**:
```tsx
<EmptyState
  icon={<Inbox />}
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

- **Every async action** (mutate, upload, send): `Button loading={pending}` — it disables and shows the spinner. Use optimistic UI where the collection supports it.
- **Every destructive action** (delete, remove, leave): `ConfirmModal` that names the item in the body ("Delete task 'Buy milk'?"), not a generic "Are you sure?".
- **Every mutation**: fire `useToast` on success and error.
- **Every form**: inline validation next to the field, not a global banner. Use `Label` + `Input` + a small `<p>` with the error.
- **Every list during initial load**: `animate-pulse` placeholder blocks (`bg-muted rounded-md`) shaped like the content. Never a blank screen with just "Loading…".
- **Hover/focus states** on every clickable element — the primitives handle this; raw `<div onClick>` does not. The scaffold also ships `*:focus-visible` outlines in `styles.css` — keep them.
- **Keyboard accessibility**: `Dialog`/`Modal`, `DropdownMenu`, `Select` all handle Esc/arrow keys + focus trapping; roll-your-own usually doesn't.

---

## 5. Verify With a Smoke Test

After customizing home, theme, and primitives, extend `smoke.spec.ts`:
- Home page renders the **real** H1 (assert the app-specific title, not the app id or "Welcome").
- The placeholder copy is **not** in the DOM (assert absence of "placeholder page").
- Primary CTA is visible and clickable.
- At least one real primitive opens on interaction (e.g., a `DropdownMenu` opens; clicking Delete opens the `ConfirmModal`).
- Page `<title>` is app-specific, not "DeepSpace".
- Spot-check a mutation and assert a toast appears.
- Keep the nav test hooks intact: `app-navigation`, `nav-sign-in-button`, `nav-user-name`.

If the smoke test passes but the app still looks unfinished, it is almost always one of: still on the `slate`/`paper` placeholder theme, missing empty states, or a `<select>` / `window.confirm` / `window.alert` / `window.prompt` still hiding somewhere. Before declaring done, run this full check block — it has two halves and BOTH matter:

```bash
# Half 1 — ABSENCE: any hit below means the app is NOT ready
grep -rn "<select\|window\.confirm\|window\.alert\|window\.prompt" src/
grep -rn "placeholder page" src/
grep -rn 'data-theme="slate"' index.html

# Half 2 — PRESENCE: any MISS below means the home page is NOT done
grep "home pattern:" 'src/pages/(app)/home.tsx'   # the §1 skeleton declaration, first line (quote the path — parentheses)
grep 'data-theme="' src/themes.css                # your own theme block exists
```
