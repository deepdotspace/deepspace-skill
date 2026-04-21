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

## 2. Theme — Retheme the `@theme` Block in `src/styles.css`

The scaffold's theme lives in `src/styles.css` inside an `@theme { ... }` block (shadcn/ui-compatible token system, Tailwind v4 `@theme` syntax). **This is the retheming surface for 95% of cases — not `DeepSpaceThemeProvider`.**

Default palette (dark slate + indigo) — these are the values to change:
```css
--color-background: #0a0f1a;   /* page background */
--color-foreground: #f1f5f9;   /* primary text */
--color-card: #0f172a;         /* card surfaces */
--color-primary: #818cf8;      /* indigo — the default "DeepSpace blue" */
--color-secondary: #1e293b;
--color-muted: #1e293b;
--color-accent: #1e293b;
--color-border: rgba(51, 65, 85, 0.5);
--color-ring: rgba(129, 140, 248, 0.5);
/* + backward-compat aliases + status colors + shadow glows */
```

**Steps when scaffolding a new app:**
1. Pick a palette **before** writing features. Any palette that reasonably fits the app's concept is fair game — cool blues, warm earth tones, paper neutrals with a vivid accent, dark with neon, muted monochrome, high-contrast mid-century, whatever. The only hard rule: don't keep the default dark-blue + indigo look. Beyond that, variety matters more than matching a "productivity = warm neutrals" heuristic — avoid cream/amber, slate/teal, or any single family just because it "feels safe."
2. Replace the `@theme` block — swap at least: `--color-background`, `--color-foreground`, `--color-primary`, `--color-secondary`, `--color-card`, `--color-accent`, `--color-ring`, and the `--shadow-glow-*` tokens so glows match the new accent. A single token swap is not enough — the UI will still read as "default DeepSpace".
3. Update the backward-compat aliases at the bottom of the `@theme` block (`--color-surface`, `--color-primary-hover`, `--color-primary-muted`, `--color-primary-border`) — several components still read these.
4. Update the favicon and `<title>` in `index.html`. The defaults say "DeepSpace".
5. If the app has a distinct identity, add a simple wordmark or logo to `Navigation.tsx` (plain text in a distinctive font counts — `font-serif`, `tracking-tight`, larger size). **Don't rewrite the rest of `Navigation.tsx`** — sign-in (`AuthOverlay` modal), sign-out (`signOut()` in avatar dropdown), user avatar, role badge, mobile menu, and nav links are already wired to the SDK and `src/nav.ts`. To add a nav item, append to `src/nav.ts`; Navigation picks it up automatically.

If the user has not specified a palette, **pick one and tell them in one line** what you picked (e.g., "Picked a deep teal + cream palette"). Do not silently keep the default. Do not ask for hex codes up front. Do not explain your reasoning unless asked — just ship and move on.

**When to use `DeepSpaceThemeProvider` / `applyDeepSpaceTheme` instead:** these are exported from `deepspace` (the root package — there is no `deepspace/theme` subpath) and drive `--theme-*` CSS variables consumed by cross-app / deployed DeepSpace components (pills, directory panels, mini-apps). They read from `--color-*` by default (`readThemeFromDOM`), so editing the `@theme` block is usually enough and they just follow. Reach for them explicitly only when embedding DeepSpace surfaces on a deployed site or mini-app that needs a different theme from the main app.

**UI dark/light mode:** the SDK reads `data-ui-theme="dark" | "light"` on `<html>` to switch between `UI_TOKENS_DARK` and `UI_TOKENS_LIGHT` (see `applyUIThemeTokens`). Set this attribute if the app supports a light/dark toggle.

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

| Use case | Use this | Do NOT use |
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
