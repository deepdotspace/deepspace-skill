# Auth — public, gated, and mixed configurations

Load this reference when picking the auth model for a new app, adding a gated page, customizing the sign-in fallback, debugging "why does my page show the AuthOverlay" / "why are signed-out users seeing my admin route," or replacing `Navigation.tsx`. Skip it for the default mixed config plus `(app)/(protected)/` page additions, which are one-line changes that don't need this depth.

## The three configurations

Auth gating is route-scoped via `<AuthGate>` from `'deepspace'`. The scaffold ships the **mixed** config by default (public landing + gated app). Pick whichever fits the product:

### 1. Fully public

Every page reachable signed-out. Don't import `<AuthGate>` anywhere; rely on `RecordProvider allowAnonymous` (already on by default in the scaffolded `(app)/_layout.tsx`). Pages still need to live under `(app)/` to reach the data layer — "public" and "static" are different axes (see the mixed config below).

### 2. Fully gated

Every dynamic page requires sign-in. Wrap the data layer in `src/pages/(app)/_layout.tsx` with `<AuthGate>` and drop `allowAnonymous` from `AuthBoot`'s `<RecordProvider>`:

```tsx
// src/pages/(app)/_layout.tsx
<DeepSpaceAuthProvider>
  <AuthGate>
    <AuthBoot>{/* AuthBoot's RecordProvider: drop allowAnonymous — nothing public */}
      <Navigation />
      <Outlet />
    </AuthBoot>
  </AuthGate>
</DeepSpaceAuthProvider>
```

Static top-level pages (like the shipped `index.tsx` landing) sit outside `(app)/` and stay reachable signed-out regardless — if truly *nothing* should render without a session, point `/` at a gated page instead of shipping the static landing.

### 3. Mixed (default)

Three tiers, decided by where the file lives under `src/pages/` (`(app)` and `(protected)` are generouted route groups — the parentheses mean they don't appear in the URL, so `(app)/home.tsx` serves `/home`):

- **Static + public** — top level of `src/pages/`. No providers mount: no `/api/auth` fetch, no records WebSocket, and no `useAuth`/`useQuery` (they crash at render). For landing/marketing/docs/legal.
- **Dynamic + public** — directly under `(app)/`. Providers mount (`(app)/_layout.tsx`); hooks work signed-out via `allowAnonymous`.
- **Dynamic + gated** — under `(app)/(protected)/`. The scaffolded `(app)/(protected)/_layout.tsx` applies `<AuthGate>` once for everything inside.

```
src/pages/
  index.tsx                 ← static landing (/) — no providers, no data hooks
  (app)/
    _layout.tsx             ← mounts the providers (auth + realtime) + Navigation
    home.tsx                ← dynamic, public (/home)
    (protected)/
      _layout.tsx           ← <AuthGate><Outlet /></AuthGate>
      settings.tsx          ← gated (/settings)
      api-status.tsx        ← gated (/api-status)
```

Adding a new gated page is a one-file change: drop it inside `(app)/(protected)/`. To flip a page between static and dynamic, move it across the `(app)/` boundary and fix up its `../` relative imports for the new depth. `npx deepspace add <feature>` places feature pages under `(app)/` (or `(app)/(protected)/`) automatically.

## `<AuthGate>` props

- `fallback` — UI shown to signed-out users. **Default: `<AuthOverlay />` rendered with no `onClose` prop, which makes it non-closeable** (the user has only one path forward — sign in). That's the right default for a fully-gated app where nothing exists outside the gate, but it traps users on a public marketing page if you mount `<AuthGate>` higher in the tree than intended. To allow dismissal or render anything other than the overlay, pass an explicit `fallback` (e.g., `fallback={<TeaserPage />}`).
- `redirectOnSignOut` — where the user lands when they sign out from inside the gate (default `'/'`). Triggers a full page reload so cached state can't leak into the signed-out view.

## Rules either way

- **Use auth-layer state for auth checks; use profile readiness for profile-backed UI.** `useAuth().isSignedIn` is the canonical signed-in check, and `useAuthStatus()` is safe in app shells before `<RecordProvider>`. `useUser()` loads async; for user menus, role nav, account names, admin controls, or authenticated dashboards under `<RecordProvider>`, prefer `useAuthProfileReady({ requireUser: true })` and render a skeleton while `isSignedIn && userLoading`.
- `<AuthGate>` controls the **UI layer** — children don't mount until signed in. `RecordProvider allowAnonymous` controls the **data layer** — server accepts unsigned client connections. Inside an `<AuthGate>` subtree the user is always signed in, so `allowAnonymous` is moot there.
- Don't add a second sign-out — the avatar dropdown in `Navigation.tsx` already calls `signOut()`.
- **If the app requires sign-in, a sign-out control is non-negotiable.** If you replace `Navigation.tsx`, ensure it still calls `signOut()` from `deepspace` somewhere reachable when signed in.
- Don't rewrite `Navigation.tsx` just to theme it — edit the `@theme` tokens or pick a `data-theme` preset (see `references/uiux.md` §2).
- **Safari + localhost cookies** — `__Secure-` cookies require HTTPS; Safari enforces this on localhost, Chrome doesn't. Auth appears broken on Safari in local dev. Works fine once deployed.
- **JWT provides user profile** — no separate `/api/users/me` call needed.

## Provider stack — extend, don't replace

The stack is split across two files:

**`src/pages/_app.tsx`** — the root shell, wrapping every route, static and dynamic alike. It deliberately mounts **no** DeepSpace providers (that's what keeps top-level pages static — no auth fetch, no WebSocket). Only local UI state lives here:

```tsx
// App() returns:
<ToastProvider>                           // from @/components/ui (local, NOT 'deepspace')
  <div data-testid="app-root">            // canonical "shell mounted" test hook — don't rename
    <Suspense><Outlet /></Suspense>
  </div>
</ToastProvider>
```

**`src/pages/(app)/_layout.tsx`** — the dynamic boundary: auth + realtime data + app chrome, for everything under `(app)/`:

```tsx
// AppLayout() returns:
<DeepSpaceAuthProvider>
  <AuthBoot>                              // local helper: waits for auth to resolve, then mounts data layer
    <Navigation />
    <main><Outlet /></main>
  </AuthBoot>
</DeepSpaceAuthProvider>

// AuthBoot mounts the data layer for everyone (signed-in OR signed-out):
<RecordProvider allowAnonymous>
  <RecordScope roomId={SCOPE_ID} schemas={schemas} appId={APP_NAME}>
    {children}
  </RecordScope>
</RecordProvider>
```

`AuthBoot` is local to `(app)/_layout.tsx`. It is **not** the same as the SDK's `<AuthGate>` — it just waits for auth to resolve (`useAuthStatus().isLoaded`) so the data layer always mounts with valid auth state, then renders children regardless of sign-in status (while resolving it shows a fixed theme-colored panel, not a spinner). Public pages render fine inside it; the data layer is in `allowAnonymous` mode by default.

Do not rewrite either file. The defaults already:

- Wrap the tree in the scaffold's local `ToastProvider` (import `useToast` from `@/components/ui`, not `deepspace`).
- Render routes for both signed-in and signed-out users.
- Expose a Sign In button in `Navigation.tsx` that opens `<AuthOverlay onClose={...}/>` (GitHub + Google + email/password) and a sign-out option in the avatar dropdown.

Extend by adding schemas, pages, and nav entries (`src/nav.ts`). To share data across DeepSpace apps (e.g., the email-handle workspace), pass `sharedScopes` to the existing `<RecordScope>` — but see `references/architecture.md` § "Cross-app shared scopes" for the worker-side proxy that's required.

## Landing pages and app chrome

The global `<Navigation />` renders from `(app)/_layout.tsx`, so it only wraps pages under `(app)/`. The shipped landing (`src/pages/index.tsx`) is a static top-level page — it never inherits app chrome, and needs no patch.

Only if your landing lives *under* `(app)/` (e.g. installed via `npx deepspace add landing`, which places it at `(app)/landing.tsx`) do you need to hide the global nav on that route, in `(app)/_layout.tsx`:

```tsx
// src/pages/(app)/_layout.tsx
import { useLocation } from 'react-router-dom'
// inside AppLayout(), above the existing markup:
const isLanding = useLocation().pathname === '/landing'
// then in the layout:
{!isLanding && <Navigation />}
```

That's the entire edit. The full landing-page workflow lives in `references/landing-design.md`.

## See also

- `references/uiux.md` § primitives for `<AuthOverlay/>` props.
