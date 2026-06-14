# Magic-Link Authentication — Design

**Date:** 2026-06-13
**Status:** Architecture approved; pending implementation plan

## Problem

The app uses **anonymous auth** (`signInAnonymously()`), and the anonymous
session is not persisted across refresh because there is **no `middleware.ts`** to
refresh the Supabase SSR auth cookie. Each lost session mints a new anonymous
`user_id`, so RLS (`auth.uid() = user_id`) hides previously-created rows — brands
"disappear" on refresh, and when anon sign-in fails entirely, captures only reach
the local offline queue ("captures queued"). The data is written but orphaned
under ephemeral identities.

## Goal

Replace anonymous auth with **email magic-link** sign-in for a permanent,
cross-device identity, behind a **hard gate** (sign-in required to use the app),
and add the missing SSR session-refresh middleware.

## Confirmed decisions

1. **Hard gate** — unauthenticated users are redirected to `/login`; all app
   routes require a session. Anonymous sign-in is removed.
2. **Magic link only** — no passwords, no OAuth, no anonymous-linking/recovery.
3. **Existing anonymous data stays orphaned** — fresh start under the real account.
   No schema migration (RLS already keys on `auth.uid()`).
4. **Sign out** lives on the **Contexts** screen header, alongside the signed-in
   email.

## Architecture & flow

```
/login (client)
  email → supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback` } })
  → "Check your email."
        │  (user clicks link in email)
        ▼
/auth/callback (server route)
  exchangeCodeForSession(code) → sets auth cookies → redirect /feed
        │
        ▼
middleware.ts (every request)
  - refresh session cookie via supabase.auth.getUser()
  - no user + protected route  → redirect /login
  - has user + on /login       → redirect /feed
```

### middleware.ts (the root-cause fix)

Uses `@supabase/ssr` `createServerClient` with `NextRequest`/`NextResponse` cookie
plumbing (`getAll` / `setAll` writing back onto the response). Calls
`supabase.auth.getUser()` to refresh the session on every request, then gates.

- **Matcher:** all routes except static assets, `/login`, `/auth/*`, `/share/*`
  (public share route stays public), and `/api/*` is allowed through (route
  handlers do their own auth via RLS).
- Protected app routes (`/feed`, `/library`, `/contexts/**`, `/capsule/**`,
  `/dossier/**`, `/`): no user → `307` redirect to `/login`.
- `/login` with a user → redirect `/feed`.

This both protects routes and keeps the auth cookie fresh — fixing the
disappear-on-refresh bug.

### Remove anonymous sign-in

- `src/lib/supabase.ts` `getOrCreateSession()` → return the current user
  (`auth.getUser()`); **remove** the `signInAnonymously()` fallback. Returns
  `null` if somehow unauthenticated (callers already handle null → offline queue).
- `src/lib/auth.ts` `getOrCreateAnonSession()` → return the current session
  (`auth.getSession()`); remove the anon fallback. (Consider consolidating the two
  helpers in a follow-up; out of scope here.)

## Files

| File | Change |
|---|---|
| `middleware.ts` | Create — SSR session refresh + route gate |
| `src/app/login/page.tsx` | Create — email magic-link request screen |
| `src/app/auth/callback/route.ts` | Create — exchange code for session, redirect |
| `src/lib/supabase.ts` | Modify — `getOrCreateSession` drops anon fallback |
| `src/lib/auth.ts` | Modify — `getOrCreateAnonSession` drops anon fallback |
| `src/app/(app)/contexts/page.tsx` | Modify — show email + Sign out in header |
| `CLAUDE.md` | Modify — note auth gate; "capture available" now means "when signed in" |

## Components

### /login page (client)

- Email input + "Send magic link" button.
- On submit: `signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })`.
- States: idle → sending → "Check your email for a sign-in link." On error, inline
  message. Styled with existing tokens (`var(--cream)`, `var(--violet)`, `var(--mono)`).
- No layout chrome from `(app)` group (it lives outside the gated group).

### /auth/callback route (server)

- `GET` reads `code` from the query string.
- `const supabase = await createServerSupabaseClient()` then
  `await supabase.auth.exchangeCodeForSession(code)`.
- On success → `NextResponse.redirect(new URL('/feed', req.url))`.
- On missing/invalid code or error → redirect `/login?error=auth`.

### Contexts header — email + Sign out

- Read the current user's email client-side (`supabase.auth.getUser()`).
- Render a small line: the email (muted) + a "Sign out" text button.
- Sign out: `await supabase.auth.signOut()` → `router.push('/login')`.

## Error handling & edge cases

- Expired/invalid magic link → callback redirects `/login?error=auth`; `/login`
  shows "That link didn't work — request a new one."
- Email send failure (SMTP/rate limit) → inline error on `/login`.
- Offline queue (`flushOfflineQueue`) unchanged — flushes on reconnect under the
  now-stable real `user_id`.
- A request that races the session refresh still resolves on the next navigation
  (middleware refreshes every request).

## Your-side configuration (cannot be done from code)

Document these in the plan as a manual checklist:

1. Supabase Dashboard → Authentication → Providers → **Email**: enabled (magic link
   / OTP). Configure SMTP, or use Supabase's built-in email for testing.
2. Authentication → URL Configuration → **Site URL** = your deployed origin;
   **Redirect URLs** allowlist includes `<origin>/auth/callback` (and a localhost
   entry for dev).
3. (Optional) Disable the **Anonymous** provider once migration is confirmed.

## Testing

- `tsc --noEmit` + `next build` (and the EF-1 fixture stays green — unaffected).
- Manual (deployed): visit app unauthenticated → redirected to `/login`; request a
  link; click it → lands on `/feed` signed in; create a brand; **refresh** → brand
  persists (the core fix); sign out → redirected to `/login`; data hidden until
  signing back in with the same email.

## Out of scope (YAGNI)

- Passwords, OAuth providers, anonymous→permanent linking, data recovery of
  orphaned anon rows.
- A full settings/profile screen (just email + sign-out on Contexts).
- Multi-tenant / team sharing.
