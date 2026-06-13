# EF-2 Export Guidelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a capsule owner download its AI Guidelines (Markdown / plain text / JSON) from the Dossier screen via an owner-only API route.

**Architecture:** A GET route `/api/guidelines/[capsuleId]?format=` builds an authenticated server Supabase client (RLS owner-scoped) and calls EF-1's `generateGuidelines(capsuleId, [format], { supabase })`. EF-1 is tweaked to accept an injected client (default unchanged). A Dossier-toolbar "Export" button opens a bottom sheet with three format rows; tapping one fetches the route and triggers a blob download.

**Tech Stack:** Next.js 14 App Router (route handler + client component), Supabase (`@supabase/ssr` authed server client), the existing `Sheet` UI primitive. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-13-ef2-export-guidelines-design.md`

---

## Testing approach

No unit-test framework in this repo. Verify with `npx tsc --noEmit` + `npx next build`, plus the EF-1 regression `npx tsx scripts/ef1-verify.ts` (must stay green — the injected-client change is additive). Real-data validation happens via the deployed route (manual: export each format from a live capsule's Dossier). `pnpm` is unavailable — use `npx`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/guidelines-generator.ts` | Modify — optional injected `supabase` client on `fetchCapsuleData` + `generateGuidelines` |
| `src/app/api/guidelines/[capsuleId]/route.ts` | Create — GET handler returning the file with download headers |
| `src/components/dossier/ExportGuidelinesSheet.tsx` | Create — 3-format sheet + blob download |
| `src/app/(app)/dossier/[capsuleId]/page.tsx` | Modify — Export button + render the sheet |

---

## Task 1: Inject optional Supabase client into EF-1

**Files:**
- Modify: `src/lib/guidelines-generator.ts`

- [ ] **Step 1: Widen the supabase import to include the type**

Find:
```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
```
Replace with:
```ts
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
```

- [ ] **Step 2: Add a FetchOpts type and accept an injected client in fetchCapsuleData**

Find:
```ts
export async function fetchCapsuleData(capsuleId: string): Promise<RawCapsuleData | null> {
  const supabase = createServiceClient()
```
Replace with:
```ts
/** Options for the read functions. Inject `supabase` to use an authed client (RLS-scoped). */
export interface FetchOpts { supabase?: SupabaseClient }

export async function fetchCapsuleData(capsuleId: string, opts?: FetchOpts): Promise<RawCapsuleData | null> {
  const supabase = opts?.supabase ?? createServiceClient()
```

- [ ] **Step 3: Thread opts through the orchestrator**

Find:
```ts
export async function generateGuidelines(
  capsuleId: string,
  formats: GuidelinesFormat[] = ['markdown', 'text', 'json'],
): Promise<GuidelinesOutput> {
  const raw = await fetchCapsuleData(capsuleId)
```
Replace with:
```ts
export async function generateGuidelines(
  capsuleId: string,
  formats: GuidelinesFormat[] = ['markdown', 'text', 'json'],
  opts?: FetchOpts,
): Promise<GuidelinesOutput> {
  const raw = await fetchCapsuleData(capsuleId, opts)
```

- [ ] **Step 4: Verify (types + EF-1 regression)**

Run: `cd "Taste App/taste" && npx tsc --noEmit && npx tsx scripts/ef1-verify.ts`
Expected: tsc clean; prints `ef1-verify: processor OK` and `ef1-verify: formatters OK` (default path unchanged).

If tsc reports that the `@supabase/ssr` server client (passed later in Task 2) is not assignable to `SupabaseClient`, that surfaces in Task 2, not here — do not pre-emptively widen the type now.

- [ ] **Step 5: Commit**

```bash
cd "Taste App/taste"
git add src/lib/guidelines-generator.ts
git commit -m "feat(ef2): inject optional supabase client into guidelines generator"
```

---

## Task 2: GET /api/guidelines/[capsuleId] route

**Files:**
- Create: `src/app/api/guidelines/[capsuleId]/route.ts`

- [ ] **Step 1: Write the route handler**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateGuidelines } from '@/lib/guidelines-generator'
import type { GuidelinesFormat } from '@/types/guidelines'

const EXT: Record<GuidelinesFormat, string> = { markdown: 'md', text: 'txt', json: 'json' }
const MIME: Record<GuidelinesFormat, string> = {
  markdown: 'text/markdown; charset=utf-8',
  text: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
}

/** Lowercase-kebab, alnum only; falls back to 'capsule'. */
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'capsule'
}

export async function GET(
  req: NextRequest,
  { params }: { params: { capsuleId: string } },
) {
  const { capsuleId } = params
  const fmtParam = req.nextUrl.searchParams.get('format')
  const format: GuidelinesFormat =
    fmtParam === 'text' || fmtParam === 'json' ? fmtParam : 'markdown'
  const slug = slugify(req.nextUrl.searchParams.get('filename') ?? 'capsule')

  try {
    const supabase = await createServerSupabaseClient()
    const out = await generateGuidelines(capsuleId, [format], { supabase })

    const body =
      format === 'json' ? JSON.stringify(out.json, null, 2)
      : format === 'text' ? (out.text ?? '')
      : (out.markdown ?? '')

    const filename = `${slug}-guidelines.${EXT[format]}`
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': MIME[format],
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = msg.startsWith('Capsule not found') ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

If tsc errors that the `createServerSupabaseClient()` return value is not assignable to `FetchOpts.supabase` (`SupabaseClient`), fix it in `src/lib/guidelines-generator.ts` by importing the type from the SSR package instead — change the `FetchOpts` field to a structural minimum:
```ts
// only if needed: replace `supabase?: SupabaseClient` with a looser type
import type { SupabaseClient } from '@supabase/supabase-js'
export interface FetchOpts { supabase?: SupabaseClient<any, any, any> }
```
Re-run `npx tsc --noEmit` and `npx tsx scripts/ef1-verify.ts` after any such change. Prefer the plain `SupabaseClient` first; only widen if tsc demands it.

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add "src/app/api/guidelines/[capsuleId]/route.ts"
git commit -m "feat(ef2): owner-scoped GET /api/guidelines/[capsuleId] route"
```

---

## Task 3: ExportGuidelinesSheet component

**Files:**
- Create: `src/components/dossier/ExportGuidelinesSheet.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'

type Fmt = 'markdown' | 'text' | 'json'

const ROWS: { fmt: Fmt; label: string; sub: string }[] = [
  { fmt: 'markdown', label: 'Markdown (.md)', sub: 'Human + agent readable' },
  { fmt: 'text', label: 'Plain text (.txt)', sub: 'Copy-paste anywhere' },
  { fmt: 'json', label: 'JSON (.json)', sub: 'Machine readable · Open Capsule Spec' },
]
const EXT: Record<Fmt, string> = { markdown: 'md', text: 'txt', json: 'json' }

interface Props {
  capsuleId: string
  filenameSlug: string
  onClose: () => void
}

export function ExportGuidelinesSheet({ capsuleId, filenameSlug, onClose }: Props) {
  const [loadingFmt, setLoadingFmt] = useState<Fmt | null>(null)
  const [error, setError] = useState(false)

  async function download(fmt: Fmt) {
    setLoadingFmt(fmt)
    setError(false)
    try {
      const res = await fetch(
        `/api/guidelines/${capsuleId}?format=${fmt}&filename=${encodeURIComponent(filenameSlug)}`,
      )
      if (!res.ok) throw new Error('export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filenameSlug}-guidelines.${EXT[fmt]}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      onClose()
    } catch {
      setError(true)
    } finally {
      setLoadingFmt(null)
    }
  }

  return (
    <Sheet open onClose={onClose}>
      <div style={{ padding: '20px 20px 28px' }}>
        <div className="label" style={{ marginBottom: 4 }}>Export guidelines</div>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 16 }}>
          Download this capsule&apos;s AI guidelines.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ROWS.map(r => (
            <button
              key={r.fmt}
              onClick={() => download(r.fmt)}
              disabled={loadingFmt !== null}
              style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 10,
                border: '1.5px solid var(--line-soft)', background: 'var(--cream-2)',
                cursor: loadingFmt ? 'default' : 'pointer',
                opacity: loadingFmt && loadingFmt !== r.fmt ? 0.5 : 1,
              }}
            >
              <div style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
                {loadingFmt === r.fmt ? 'Preparing…' : r.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{r.sub}</div>
            </button>
          ))}
        </div>
        {error && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 12 }}>
            Export failed — try again.
          </p>
        )}
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add src/components/dossier/ExportGuidelinesSheet.tsx
git commit -m "feat(ef2): ExportGuidelinesSheet (md/txt/json blob download)"
```

---

## Task 4: Dossier toolbar integration

**Files:**
- Modify: `src/app/(app)/dossier/[capsuleId]/page.tsx`

- [ ] **Step 1: Import the sheet**

Add alongside the existing imports (near `import { Ic } from '@/components/icons'`):
```tsx
import { ExportGuidelinesSheet } from '@/components/dossier/ExportGuidelinesSheet'
```

- [ ] **Step 2: Add export-sheet state**

After the existing `const [copyFeedback, setCopyFeedback] = useState(false)` line, add:
```tsx
  const [exportOpen, setExportOpen] = useState(false)
```

- [ ] **Step 3: Add the Export button to the toolbar**

The toolbar currently renders the back button, the name span, the Public toggle, and the conditional Copy-link button. Insert an Export button immediately BEFORE the Public toggle. Find:
```tsx
        {/* Public toggle */}
        <button
          onClick={handlePublicToggle}
```
Insert this block right before that comment:
```tsx
        {/* Export guidelines */}
        <button
          onClick={() => setExportOpen(true)}
          style={{
            padding: '5px 12px', borderRadius: 6,
            background: 'var(--panel)', border: '1px solid var(--line)',
            color: 'var(--ink-faint)', fontSize: 10, fontFamily: 'var(--mono)',
            cursor: 'pointer', letterSpacing: '0.06em',
          }}
        >
          Export
        </button>

        {/* Public toggle */}
        <button
          onClick={handlePublicToggle}
```

- [ ] **Step 4: Render the sheet**

The component currently ends with the outer `</div>` of the returned JSX (after the dossier `<div style={{ paddingTop: 48 }}>...</div>`). Add the sheet just before that final closing `</div>`. Find:
```tsx
      {/* Dossier — padded below toolbar */}
      <div style={{ paddingTop: 48 }}>
        <DossierDocument
          capsule={capsule}
          context={context}
          parent={parent}
          theme={theme}
          isOwner={true}
          onThemeToggle={handleThemeToggle}
          onExportPDF={handleExportPDF}
        />
      </div>
    </div>
  )
}
```
Replace with:
```tsx
      {/* Dossier — padded below toolbar */}
      <div style={{ paddingTop: 48 }}>
        <DossierDocument
          capsule={capsule}
          context={context}
          parent={parent}
          theme={theme}
          isOwner={true}
          onThemeToggle={handleThemeToggle}
          onExportPDF={handleExportPDF}
        />
      </div>

      {exportOpen && (
        <ExportGuidelinesSheet
          capsuleId={capsule.id}
          filenameSlug={`${context.name}-${capsule.version}`}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  )
}
```
(At this point in the component, `capsule` and `context` are guaranteed non-null — the early `if (!capsule || !context) return ...` guard precedes this return.)

- [ ] **Step 5: Verify**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "Taste App/taste"
git add "src/app/(app)/dossier/[capsuleId]/page.tsx"
git commit -m "feat(ef2): Export button + sheet on the Dossier toolbar"
```

---

## Task 5: Final verification + docs

**Files:**
- Modify: `Taste App/taste/CLAUDE.md`

- [ ] **Step 1: Full checks**

Run: `cd "Taste App/taste" && npx tsc --noEmit && npx tsx scripts/ef1-verify.ts && npx next build`
Expected: tsc clean; both ef1-verify lines print; build succeeds and lists the new route `ƒ /api/guidelines/[capsuleId]`.

- [ ] **Step 2: Document in CLAUDE.md**

Add after the EF-1 block near the top of `Taste App/taste/CLAUDE.md`:
```markdown
EF-2 Export Guidelines — COMPLETE
Owner-only download of a capsule's AI guidelines from the Dossier screen.
- `src/app/api/guidelines/[capsuleId]/route.ts` — GET ?format=markdown|text|json; authed server client (RLS owner-scoped); Content-Disposition attachment; 404 when capsule not found/owned
- `src/components/dossier/ExportGuidelinesSheet.tsx` — Sheet with 3 format rows → fetch → blob download
- `src/app/(app)/dossier/[capsuleId]/page.tsx` — Export button in the toolbar
- `src/lib/guidelines-generator.ts` — fetchCapsuleData/generateGuidelines accept an optional injected supabase client (FetchOpts); default = service client (EF-1 path unchanged)
No new deps; no service-role key in this path.
```

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add CLAUDE.md
git commit -m "docs: record EF-2 export guidelines in CLAUDE.md"
```

---

## Self-Review notes

- **Spec coverage:** injected client (Task 1), owner-scoped route with format/filename/headers/404 (Task 2), 3-format sheet + blob download (Task 3), toolbar button + sheet render (Task 4), build + docs (Task 5). All spec sections map to a task.
- **Type consistency:** `FetchOpts`/`GuidelinesFormat`/`GuidelinesOutput` from EF-1 used unchanged; `generateGuidelines(id, [format], { supabase })` signature matches Task 1. The sheet's `Fmt` union mirrors `GuidelinesFormat`.
- **No placeholders:** complete code in every step; the one conditional (type-widening in Task 2 Step 2) is a contingent, fully-specified fallback, not a TODO.
- **Out of scope confirmed:** no zip, no new deps, no `exported_at` write, no `/share` change.
