# Auth — public, gated, and mixed configurations

Load this reference when picking the auth model for a new app, adding a gated page, customizing the sign-in fallback, debugging "why does my page show the AuthOverlay" / "why are signed-out users seeing my admin route," or replacing `Navigation.tsx`. Skip it for the default mixed config plus `(protected)/` page additions, which are one-line changes that don't need this depth.

## The three configurations

Auth gating is route-scoped via `<AuthGate>` from `'deepspace'`. The scaffold ships the **mixed** config by default (public landing + gated app). Pick whichever fits the product:

### 1. Fully public

Every page reachable signed-out. Don't import `<AuthGate>` anywhere; rely on `RecordProvider allowAnonymous` (already on by default in the scaffolded `_app.tsx`).

### 2. Fully gated

Every page requires sign-in. Wrap the tree in `_app.tsx` with `<AuthGate>` and drop `allowAnonymous`:

```tsx
// src/pages/_app.tsx
<DeepSpaceAuthProvider>
  <AuthGate>
    <RecordProvider>{/* no allowAnonymous — nothing public */}
      <RecordScope ...>
        <Navigation />
        <Outlet />
      </RecordScope>
    </RecordProvider>
  </AuthGate>
</DeepSpaceAuthProvider>
```

### 3. Mixed (default)

Public pages live at `src/pages/<name>.tsx`; gated pages go inside the `(protected)/` generouted route group. The scaffolded `src/pages/(protected)/_layout.tsx` applies `<AuthGate>` once for everything inside:

```
src/pages/
  home.tsx                  ← public (/home)
  landing.tsx               ← public (/landing)
  (protected)/
    _layout.tsx             ← <AuthGate><Outlet /></AuthGate>
    settings.tsx            ← gated (/settings)
    dashboard.tsx           ← gated (/dashboard)
```

Adding a new gated page is a one-file change: drop it inside `(protected)/`. The folder name is wrapped in literal parentheses — generouted treats it as a route group that doesn't appear in the URL.

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

The scaffolded `src/pages/_app.tsx` ships:

```tsx
// App() returns:
<ToastProvider>                           // from ../components/ui (local, NOT 'deepspace')
  <DeepSpaceAuthProvider>
    <AuthBoot>                            // local helper: shows loader while auth resolves, then mounts data layer
      <Navigation />
      <main><Outlet /></main>
    </AuthBoot>
  </DeepSpaceAuthProvider>
</ToastProvider>

// AuthBoot mounts the data layer for everyone (signed-in OR signed-out):
<RecordProvider allowAnonymous>
  <RecordScope roomId={SCOPE_ID} schemas={schemas} appId={APP_NAME}>
    {children}
  </RecordScope>
</RecordProvider>
```

`AuthBoot` is local to `_app.tsx`. It is **not** the same as the SDK's `<AuthGate>` — it just waits for `useAuth().isLoaded` so the data layer always mounts with valid auth state, and then renders children regardless of sign-in status. Public pages render fine inside it; the data layer is in `allowAnonymous` mode by default.

Do not rewrite `_app.tsx`. The defaults already:

- Wrap the tree in the scaffold's local `ToastProvider` (import `useToast` from `../components/ui`, not `deepspace`).
- Render routes for both signed-in and signed-out users.
- Expose a Sign In button in `Navigation.tsx` that opens `<AuthOverlay onClose={...}/>` (GitHub + Google + email/password) and a sign-out option in the avatar dropdown.

Extend by adding schemas, pages, and nav entries (`src/nav.ts`). To share data across DeepSpace apps (e.g., the email-handle workspace), pass `sharedScopes` to the existing `<RecordScope>` — but see `references/architecture.md` § "Cross-app shared scopes" for the worker-side proxy that's required.

## Landing-page exception

If (and only if) you're building a public landing page, conditionally hide the global `<Navigation />` on the landing route(s) so your landing's own nav (or no-nav) owns the viewport. The default scaffold stacks Navigation above every `<Outlet />`, which would put landing-page chrome on top of app chrome:

```tsx
import { useLocation } from 'react-router-dom'
// inside App(), above the existing markup:
const isLanding = useLocation().pathname === '/' || useLocation().pathname === '/landing'
// then in the layout:
{!isLanding && <Navigation />}
```

That's the entire edit. The full landing-page workflow lives in `references/landing-design.md`.

## See also

- `references/uiux.md` § primitives for `<AuthOverlay/>` props.
