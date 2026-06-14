# Magic-Link Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace anonymous auth with hard-gated email magic-link sign-in, and add the missing SSR session-refresh middleware that fixes data disappearing on refresh.

**Architecture:** A root `middleware.ts` refreshes the Supabase auth cookie on every request and redirects unauthenticated users to `/login`. `/login` requests a magic link; `/auth/callback` exchanges the code for a session and redirects to `/feed`. Both session helpers drop their `signInAnonymously()` fallback. The Contexts header shows the signed-in email + Sign out.

**Tech Stack:** Next.js 14 App Router (middleware, route handler, client page), `@supabase/ssr` (already a dependency). No new packages, no schema migration.

**Spec:** `docs/superpowers/specs/2026-06-13-magic-link-auth-design.md`

---

## Testing approach

No unit-test framework. Verify with `npx tsc --noEmit` + `npx next build`. The EF-1 fixture (`npx tsx scripts/ef1-verify.ts`) must stay green (unaffected). Real auth flow is validated on the deployed site (manual checklist in Task 6). `pnpm` is unavailable — use `npx`.

**IMPORTANT — manual Supabase config is a prerequisite for the flow to work at runtime** (it does not affect the build). It is listed as a checklist in Task 6; the code can be built and merged before it's done, but sign-in won't succeed until the dashboard is configured.

---

## File Structure

| File | Responsibility |
|---|---|
| `middleware.ts` | Refresh session cookie + gate unauthenticated requests to `/login` |
| `src/app/auth/callback/route.ts` | Exchange magic-link code for a session, redirect |
| `src/app/login/page.tsx` | Request a magic link; redirect away if already signed in |
| `src/lib/supabase.ts` | `getOrCreateSession` returns current user (no anon fallback) |
| `src/lib/auth.ts` | `getOrCreateAnonSession` returns current session (no anon fallback) |
| `src/app/(app)/contexts/page.tsx` | Email + Sign out in the header |
| `CLAUDE.md` | Note the auth gate |

---

## Task 1: Session-refresh + gate middleware

**Files:**
- Create: `middleware.ts` (repo root, i.e. `Taste App/taste/middleware.ts`)

- [ ] **Step 1: Write the middleware**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Start with a pass-through response we can attach refreshed cookies to.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session (rotates the cookie) and read the user.
  const { data: { user } } = await supabase.auth.getUser()

  // Gate: no user on a protected route → redirect to /login.
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated: return the response carrying refreshed auth cookies.
  return response
}

export const config = {
  // Run on everything EXCEPT: Next internals, the auth entry points (/login,
  // /auth/*), the public share route, API routes (they enforce their own RLS),
  // and static asset files.
  matcher: [
    '/((?!_next/static|_next/image|login|auth|share|api|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|otf|woff|woff2|ico)).*)',
  ],
}
```

- [ ] **Step 2: Verify**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add middleware.ts
git commit -m "feat(auth): SSR session-refresh + route gate middleware"
```

---

## Task 2: /auth/callback route

**Files:**
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Write the callback handler**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/** Exchanges the magic-link code for a session cookie, then redirects. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth', req.url))
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth', req.url))
  }

  return NextResponse.redirect(new URL('/feed', req.url))
}
```

- [ ] **Step 2: Verify**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add src/app/auth/callback/route.ts
git commit -m "feat(auth): /auth/callback exchanges magic-link code for session"
```

---

## Task 3: /login page

**Files:**
- Create: `src/app/login/page.tsx`

This page lives OUTSIDE the `(app)` route group, so it has no nav/capture chrome. It reads the `?error=auth` flag via `window.location` (not `useSearchParams`) to avoid the Next 14 Suspense-boundary build requirement.

- [ ] **Step 1: Write the login page**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [linkError, setLinkError] = useState(false)

  // Already signed in → go straight to the app.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/feed')
    })
    if (new URLSearchParams(window.location.search).get('error') === 'auth') {
      setLinkError(true)
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setLinkError(false)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--cream)', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{
          fontFamily: 'var(--display)', fontSize: 32, fontWeight: 400,
          letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 8,
        }}>
          Taste
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 28, lineHeight: 1.5 }}>
          Sign in with your email. We&apos;ll send you a one-tap sign-in link.
        </p>

        {status === 'sent' ? (
          <div style={{
            padding: '16px 18px', borderRadius: 12, background: 'var(--cream-2)',
            border: '1.5px solid var(--line-soft)',
          }}>
            <p style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 4, fontFamily: 'var(--mono)' }}>
              Check your email
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
              A sign-in link is on its way to {email}. Open it on this device.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@studio.com"
              autoComplete="email"
              required
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 10,
                border: '1.5px solid var(--line-soft)', background: 'var(--cream-2)',
                color: 'var(--ink)', fontSize: 14, marginBottom: 10,
                fontFamily: 'var(--mono)',
              }}
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                background: 'var(--violet)', color: '#fff', fontSize: 13,
                letterSpacing: '0.04em', border: 'none',
                cursor: status === 'sending' ? 'default' : 'pointer',
                opacity: status === 'sending' ? 0.6 : 1,
              }}
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}

        {linkError && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 12 }}>
            That link didn&apos;t work — request a new one.
          </p>
        )}
        {status === 'error' && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 12 }}>
            Couldn&apos;t send the link — check the address and try again.
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add src/app/login/page.tsx
git commit -m "feat(auth): /login magic-link request screen"
```

---

## Task 4: Remove anonymous sign-in from the session helpers

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Update getOrCreateSession (supabase.ts)**

In `src/lib/supabase.ts`, find:
```ts
/**
 * Returns the current user, signing in anonymously if no session exists.
 * Call this before any write operation that requires auth.uid() in RLS.
 */
export async function getOrCreateSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return user

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('getOrCreateSession: anon sign-in failed', error)
    return null
  }
  return data.user
}
```
Replace with:
```ts
/**
 * Returns the current authenticated user, or null if not signed in.
 * Routes are gated by middleware, so app-route callers always have a user;
 * a null here means the caller should fall back to the offline queue.
 */
export async function getOrCreateSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}
```

- [ ] **Step 2: Update getOrCreateAnonSession (auth.ts)**

Replace the entire contents of `src/lib/auth.ts` with:
```ts
import { createClient } from '@/lib/supabase'

/**
 * Returns the current session, or null if not signed in.
 * (Anonymous sign-in was removed in favour of magic-link auth.)
 */
export async function getOrCreateAnonSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
```

- [ ] **Step 3: Verify**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors. (Callers of both helpers already handle `null` — no signature change.)

- [ ] **Step 4: Commit**

```bash
cd "Taste App/taste"
git add src/lib/supabase.ts src/lib/auth.ts
git commit -m "feat(auth): drop anonymous sign-in from session helpers"
```

---

## Task 5: Email + Sign out on the Contexts header

**Files:**
- Modify: `src/app/(app)/contexts/page.tsx`

- [ ] **Step 1: Import the browser client**

The file already imports React hooks and `useRouter`. Add near the other imports:
```tsx
import { createClient } from '@/lib/supabase'
```

- [ ] **Step 2: Track the signed-in email and add a sign-out handler**

In the `ContextsPage` component body, near the existing `const { enterFocus } = useFocus()` (or `const router = useRouter()`), add:
```tsx
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }
```
(`useState` and `useEffect` are already imported in this file.)

- [ ] **Step 3: Render email + Sign out in the header**

Find the header block:
```tsx
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4, letterSpacing: '0.02em' }}>
          Brands and projects for your captures
        </p>
      </div>
```
Replace with:
```tsx
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4, letterSpacing: '0.02em' }}>
          Brands and projects for your captures
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          {email && (
            <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              marginLeft: 'auto', padding: '4px 11px', borderRadius: 20,
              background: 'var(--panel)', border: '1px solid var(--line)',
              color: 'var(--ink-faint)', fontSize: 10, fontFamily: 'var(--mono)',
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
```

- [ ] **Step 4: Verify**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "Taste App/taste"
git add "src/app/(app)/contexts/page.tsx"
git commit -m "feat(auth): email + Sign out on the Contexts header"
```

---

## Task 6: Final verification, docs, and Supabase config checklist

**Files:**
- Modify: `Taste App/taste/CLAUDE.md`

- [ ] **Step 1: Full checks**

Run: `cd "Taste App/taste" && npx tsc --noEmit && npx tsx scripts/ef1-verify.ts && npx next build`
Expected: tsc clean; both ef1-verify lines print; build succeeds. The build output should list `ƒ Middleware` and the `/login` + `/auth/callback` routes.

- [ ] **Step 2: Document in CLAUDE.md**

Add after the Current Phase block near the top of `Taste App/taste/CLAUDE.md`:
```markdown
Magic-Link Auth — COMPLETE
Hard-gated email magic-link sign-in (anonymous auth removed).
- `middleware.ts` — refreshes the Supabase session cookie every request + redirects unauthenticated app-route requests to /login (this is what fixes data disappearing on refresh)
- `src/app/login/page.tsx` — request a magic link (signInWithOtp)
- `src/app/auth/callback/route.ts` — exchangeCodeForSession → /feed
- `src/lib/supabase.ts` / `src/lib/auth.ts` — session helpers return the current user/session; no more signInAnonymously
- `src/app/(app)/contexts/page.tsx` — signed-in email + Sign out
Public routes (not gated): /login, /auth/*, /share/*, /api/*, static assets.
RLS unchanged (auth.uid()). Pre-auth anonymous data remains orphaned.
```

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add CLAUDE.md
git commit -m "docs: record magic-link auth in CLAUDE.md"
```

- [ ] **Step 4: Manual Supabase dashboard config (REQUIRED before the flow works)**

This cannot be done from code. After deploy, in the Supabase dashboard for this project:

1. **Authentication → Providers → Email**: ensure Email is enabled (magic link / OTP). Configure SMTP, or use Supabase's built-in email for testing.
2. **Authentication → URL Configuration**:
   - **Site URL** = your production origin (e.g. `https://taste-…vercel.app`).
   - **Redirect URLs**: add `<production-origin>/auth/callback` and `http://localhost:3000/auth/callback` for local dev.
3. (Optional) **Authentication → Providers → Anonymous**: disable it now that anonymous sign-in is removed from the app.

Note these in the deploy summary so the user completes them.

---

## Self-Review notes

- **Spec coverage:** middleware gate + session refresh (Task 1), callback (Task 2), login (Task 3), anon removal (Task 4), email + sign out (Task 5), build + docs + config checklist (Task 6). All spec sections map to a task.
- **Public-route consistency:** the middleware matcher excludes `/login`, `/auth`, `/share`, `/api`, and static assets — matching the spec's public set. The callback is never gated (so the code exchange can run before a session exists).
- **No placeholders:** complete code in every step. The only non-code work (Supabase dashboard) is an explicit manual checklist, flagged as a runtime (not build) prerequisite.
- **Type/behavior consistency:** both session helpers keep their names and return types (`user | null`, `session | null`), so no caller changes are required. `signInWithOtp` / `exchangeCodeForSession` / `signOut` are standard `@supabase/ssr` client/server methods.
- **Out of scope confirmed:** no passwords/OAuth/linking, no data recovery, no schema migration, no settings screen.
