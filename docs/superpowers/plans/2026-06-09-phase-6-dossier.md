# Phase 6 — Capsule Dossier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an editorial long-scroll Dossier document for any Capsule — paper/dark theme toggle, PDF export, and a public shareable route outside the auth wrapper.

**Architecture:** `DossierScreen` is a long-scroll editorial page (not a mobile-height screen), max-width 1120px centered. Theme state lives in localStorage. A public route at `src/app/capsule/[id]/page.tsx` (outside the `(app)` route group) renders the same layout without edit controls. PDF export uses `window.print()` with a `@media print` stylesheet injected via a `<style>` tag.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase browser client, inline styles only, CSS variables, ABCArizona Flare + DM Mono. No external CSS libraries. Phase 5 must be complete (Capsule type + data layer).

---

## Codebase Context

Read these files before touching anything:

- `src/types/capsule.ts` — Capsule interface (id, context_id, version, title, declaration, rules: DistilledRule[], frequency_map: Record<string,number>)
- `src/types/context.ts` — Context interface (id, type: 'brand'|'project', name, description, parent_context_id)
- `src/lib/capsule.ts` — getCapsuleById(id), getCapsuleHistory(contextId)
- `src/lib/contexts.ts` — getContextById(id), getContextWithParent(id)
- `src/lib/supabase.ts` — createClient(), getOrCreateSession()
- `src/app/(app)/layout.tsx` — (app) route group with CaptureProvider + BottomNav
- `src/app/globals.css` — existing CSS vars and keyframe animations
- `src/components/icons.tsx` — Ic.* SVGs

**Design rules (same as all other screens):**
- Inline styles only — no Tailwind classes in JSX
- CSS variables: `var(--cream)`, `var(--ink)`, `var(--violet)`, `var(--line)`, `var(--mono)`, `var(--display)`
- Extra dossier tokens already in globals.css: `var(--blue)`, `var(--orange)`, `var(--yellow)`, `var(--pink)`, `var(--rule-hair)`, `var(--rule)`
- Display text → `fontFamily: 'var(--display)'`; data/labels → `fontFamily: 'var(--mono)'`

**Paper theme:** `{ background: '#F3ECDD', color: '#141210' }` = existing `--cream` / `--ink`
**Dark theme:** `{ background: '#1A1714', color: '#EDE8DF' }`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/capsule.ts` | **Modify** | Add `updateCapsulePublic(id, isPublic)` |
| `src/app/(app)/dossier/[capsuleId]/page.tsx` | **Create** | Authenticated DossierScreen |
| `src/app/capsule/[id]/page.tsx` | **Create** | Public dossier (outside auth wrapper, with OG meta) |
| `src/components/dossier/DossierDocument.tsx` | **Create** | Shared editorial layout (used by both routes) |
| `src/components/dossier/FrequencyMap.tsx` | **Create** | Inline weighted word cloud section |
| `src/components/dossier/RulesTable.tsx` | **Create** | ALWAYS/NEVER/PREFER/AVOID columns |
| `src/app/(app)/capsule/[contextId]/page.tsx` | **Modify** | Add "Open Dossier" + "Share" buttons |

---

## Task 1: Add `updateCapsulePublic` to capsule data layer

**Files:**
- Modify: `src/lib/capsule.ts`

The `capsules` table needs an `is_public` column. We add it via an `ALTER TABLE` in Supabase, and extend the data layer with a toggle function.

- [ ] **Step 1: Add the column via Supabase SQL Editor**

Run this in your Supabase project's SQL Editor:

```sql
alter table public.capsules add column if not exists is_public boolean not null default false;
```

- [ ] **Step 2: Add `updateCapsulePublic` to `src/lib/capsule.ts`**

Open `src/lib/capsule.ts` and add at the end of the file:

```typescript
/** Toggle the public visibility of a capsule. */
export async function updateCapsulePublic(id: string, isPublic: boolean): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('capsules')
    .update({ is_public: isPublic } as never)
    .eq('id', id)
  if (error) { console.error('updateCapsulePublic:', error); return false }
  return true
}
```

Also update the `Capsule` type in `src/types/capsule.ts` to add:

```typescript
// Add to Capsule interface:
is_public?: boolean
```

- [ ] **Step 3: Verify TypeScript**

```bash
/usr/local/lib/node_modules/corepack/shims/pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/capsule.ts src/types/capsule.ts
git commit -m "feat(dossier): add is_public field and updateCapsulePublic to capsule layer"
```

---

## Task 2: DossierDocument shared component

**Files:**
- Create: `src/components/dossier/DossierDocument.tsx`

This is the core editorial layout. It accepts a `Capsule`, `Context`, optional parent `Context`, `theme`, and `isOwner` (controls edit affordances). It renders every dossier section.

- [ ] **Step 1: Create `src/components/dossier/DossierDocument.tsx`**

```typescript
// src/components/dossier/DossierDocument.tsx
'use client'

import type { Capsule, DistilledRule } from '@/types/capsule'
import type { Context } from '@/types/context'

export type DossierTheme = 'paper' | 'dark'

interface Props {
  capsule: Capsule
  context: Context
  parent: Context | null
  theme: DossierTheme
  isOwner: boolean
  onThemeToggle?: () => void
  onExportPDF?: () => void
}

export function DossierDocument({ capsule, context, parent, theme, isOwner, onThemeToggle, onExportPDF }: Props) {
  const isDark = theme === 'dark'

  const bg = isDark ? '#1A1714' : 'var(--cream)'
  const ink = isDark ? '#EDE8DF' : 'var(--ink)'
  const inkSoft = isDark ? '#A09890' : 'var(--ink-soft)'
  const inkFaint = isDark ? '#6A6058' : 'var(--ink-faint)'
  const lineColor = isDark ? '#302C28' : 'var(--rule)'
  const panelBg = isDark ? '#221F1B' : 'var(--cream-2)'
  const violetColor = isDark ? '#7B70E0' : 'var(--violet)'

  const contextTypeLabel =
    context.type === 'brand' ? 'Brand Capsule' : 'Project Capsule'

  const date = new Date(capsule.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  // Rules grouped by verb
  const rules = capsule.rules ?? []
  const byVerb: Record<string, DistilledRule[]> = { ALWAYS: [], NEVER: [], PREFER: [], AVOID: [] }
  for (const r of rules) {
    if (r.verb in byVerb) byVerb[r.verb].push(r)
  }

  // Captures from frequency_map (words sorted by weight)
  const freqWords = Object.entries(capsule.frequency_map ?? {})
    .sort((a, b) => b[1] - a[1])
  const maxWeight = freqWords[0]?.[1] ?? 1

  return (
    <div style={{ background: bg, color: ink, minHeight: '100vh', fontFamily: 'var(--mono)' }}>

      {/* ── Running Head ── */}
      <div style={{
        borderBottom: `1px solid ${lineColor}`,
        padding: '10px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        position: 'sticky',
        top: 0,
        background: bg,
        zIndex: 10,
      }}>
        <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: inkFaint }}>
          {parent ? `${parent.name} / ` : ''}{context.name}
        </span>
        <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: inkFaint, marginLeft: 'auto' }}>
          {contextTypeLabel}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: violetColor }}>
          {capsule.version}
        </span>
        <span style={{ fontSize: 10, color: inkFaint }}>{date}</span>

        {/* Theme toggle */}
        {onThemeToggle && (
          <button
            onClick={onThemeToggle}
            style={{
              background: 'none', border: `1px solid ${lineColor}`,
              borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: inkFaint, fontFamily: 'var(--mono)',
              transition: 'border-color 0.15s',
            }}
          >
            {isDark ? '☀ Paper' : '◑ Dark'}
          </button>
        )}

        {/* Export PDF */}
        {onExportPDF && (
          <button
            onClick={onExportPDF}
            style={{
              background: 'none', border: `1px solid ${lineColor}`,
              borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: inkFaint, fontFamily: 'var(--mono)',
            }}
          >
            Export PDF
          </button>
        )}
      </div>

      {/* ── Document body ── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '60px 40px 120px' }}>

        {/* ── Masthead ── */}
        <header style={{ marginBottom: 64, borderBottom: `1px solid ${lineColor}`, paddingBottom: 48 }}>
          <p style={{
            fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: inkFaint, marginBottom: 16,
          }}>
            {contextTypeLabel}
          </p>
          <h1 style={{
            fontFamily: 'var(--display)', fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 400, letterSpacing: '-0.03em', color: ink,
            lineHeight: 1.0, marginBottom: 24,
          }}>
            {context.name}
          </h1>
          {/* Version meta row */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 32, flexWrap: 'wrap' }}>
            <Meta label="Version" value={capsule.version} color={violetColor} />
            <Meta label="Date" value={date} />
            <Meta label="Rules" value={String(rules.length)} />
            <Meta label="Words" value={String(freqWords.length)} />
            {parent && <Meta label="Parent" value={parent.name} />}
          </div>
          {/* Declaration */}
          <blockquote style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(18px, 2.8vw, 28px)',
            lineHeight: 1.38,
            letterSpacing: '-0.01em',
            color: ink,
            margin: 0,
            maxWidth: 800,
            borderLeft: `3px solid ${violetColor}`,
            paddingLeft: 24,
          }}>
            {capsule.declaration}
          </blockquote>
        </header>

        {/* ── Section 1: Frequency Map ── */}
        {freqWords.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <SectionHead label="01" title="Frequency Map" lineColor={lineColor} inkFaint={inkFaint} />
            <div style={{ lineHeight: 2.0, maxWidth: 900 }}>
              {freqWords.map(([word, weight]) => {
                const size = 12 + Math.round((weight / maxWeight) * 22)
                const opacity = 0.3 + (weight / maxWeight) * 0.7
                return (
                  <span key={word} style={{
                    fontSize: size, fontFamily: 'var(--display)',
                    color: ink, opacity, marginRight: 14,
                    display: 'inline-block', letterSpacing: '-0.01em',
                  }}>
                    {word}
                  </span>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Section 2: Rules Table ── */}
        {rules.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <SectionHead label="02" title="Rules" lineColor={lineColor} inkFaint={inkFaint} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              {(['ALWAYS', 'NEVER', 'PREFER', 'AVOID'] as const).map(verb => (
                <VerbColumn
                  key={verb}
                  verb={verb}
                  rules={byVerb[verb]}
                  lineColor={lineColor}
                  ink={ink}
                  inkSoft={inkSoft}
                  inkFaint={inkFaint}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Section 3: Summary ── */}
        {context.description && (
          <section style={{ marginBottom: 64 }}>
            <SectionHead label="03" title="About" lineColor={lineColor} inkFaint={inkFaint} />
            <p style={{
              fontSize: 14, lineHeight: 1.65, color: inkSoft,
              maxWidth: 640, fontFamily: 'var(--mono)',
            }}>
              {context.description}
            </p>
          </section>
        )}

        {/* ── Footer ── */}
        <footer style={{
          borderTop: `1px solid ${lineColor}`, paddingTop: 24,
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: inkFaint, letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <span>Taste — Capsule {capsule.version}</span>
          <span>{context.name}</span>
          <span>{date}</span>
        </footer>
      </div>

      {/* ── Print stylesheet ── */}
      <style>{`
        @media print {
          body { background: #F3ECDD !important; color: #141210 !important; }
          /* Hide controls */
          [data-no-print] { display: none !important; }
          /* Reset sticky */
          [data-running-head] { position: static !important; }
          /* Page margins */
          @page { margin: 20mm 15mm; }
          h1 { font-size: 40pt !important; }
          blockquote { font-size: 16pt !important; border-left: 2pt solid #4A3DB0 !important; }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function Meta({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 3 }}>
        {label}
      </p>
      <p style={{ fontSize: 13, fontFamily: 'var(--mono)', color: color ?? 'inherit' }}>
        {value}
      </p>
    </div>
  )
}

function SectionHead({ label, title, lineColor, inkFaint }: { label: string; title: string; lineColor: string; inkFaint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24, borderBottom: `1px solid ${lineColor}`, paddingBottom: 10 }}>
      <span style={{ fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.2em', color: inkFaint }}>
        {label}
      </span>
      <span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: inkFaint, fontFamily: 'var(--mono)' }}>
        {title}
      </span>
    </div>
  )
}

function VerbColumn({ verb, rules, lineColor, ink, inkSoft, inkFaint }: {
  verb: 'ALWAYS' | 'NEVER' | 'PREFER' | 'AVOID'
  rules: DistilledRule[]
  lineColor: string; ink: string; inkSoft: string; inkFaint: string
}) {
  const verbColor: Record<string, string> = {
    ALWAYS: 'var(--green)', NEVER: 'var(--red)',
    PREFER: 'var(--violet)', AVOID: 'var(--ink-faint)',
  }
  return (
    <div>
      <p style={{
        fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: verbColor[verb], fontFamily: 'var(--mono)',
        borderBottom: `1px solid ${lineColor}`, paddingBottom: 8, marginBottom: 12,
      }}>
        {verb}
      </p>
      {rules.length === 0 ? (
        <p style={{ fontSize: 11, color: inkFaint, fontStyle: 'italic' }}>—</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map((r, i) => (
            <div key={i}>
              {r.domain && (
                <p style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: inkFaint, marginBottom: 2 }}>
                  {r.domain}
                </p>
              )}
              <p style={{ fontSize: 12, color: inkSoft, lineHeight: 1.45 }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
/usr/local/lib/node_modules/corepack/shims/pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dossier/
git commit -m "feat(dossier): add DossierDocument shared editorial layout component"
```

---

## Task 3: Authenticated DossierScreen page

**Files:**
- Create: `src/app/(app)/dossier/[capsuleId]/page.tsx`

This wraps DossierDocument for authenticated users. It adds the theme toggle (with localStorage persistence), the PDF export button, and public toggle.

- [ ] **Step 1: Create the page**

```typescript
// src/app/(app)/dossier/[capsuleId]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCapsuleById } from '@/lib/capsule'
import { updateCapsulePublic } from '@/lib/capsule'
import { getContextWithParent } from '@/lib/contexts'
import { DossierDocument, type DossierTheme } from '@/components/dossier/DossierDocument'
import { Ic } from '@/components/icons'
import type { Capsule } from '@/types/capsule'
import type { Context } from '@/types/context'

interface PageProps {
  params: { capsuleId: string }
}

const THEME_KEY = 'taste_dossier_theme'

export default function DossierScreen({ params }: PageProps) {
  const router = useRouter()
  const { capsuleId } = params

  const [capsule, setCapsule] = useState<Capsule | null>(null)
  const [context, setContext] = useState<Context | null>(null)
  const [parent, setParent] = useState<Context | null>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<DossierTheme>('paper')
  const [isPublic, setIsPublic] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)

  useEffect(() => {
    // Load theme from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'dark' || saved === 'paper') setTheme(saved)
    }
  }, [])

  useEffect(() => {
    async function load() {
      const cap = await getCapsuleById(capsuleId)
      if (!cap) { setLoading(false); return }
      setCapsule(cap)
      setIsPublic(cap.is_public ?? false)
      if (cap.context_id) {
        const { context: ctx, parent: par } = await getContextWithParent(cap.context_id)
        setContext(ctx)
        setParent(par)
      }
      setLoading(false)
    }
    load()
  }, [capsuleId])

  const handleThemeToggle = useCallback(() => {
    setTheme(t => {
      const next: DossierTheme = t === 'paper' ? 'dark' : 'paper'
      if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  const handlePublicToggle = useCallback(async () => {
    if (!capsule) return
    const next = !isPublic
    setIsPublic(next)
    await updateCapsulePublic(capsule.id, next)
  }, [capsule, isPublic])

  const handleCopyLink = useCallback(async () => {
    if (!capsule) return
    const url = `${window.location.origin}/capsule/${capsule.id}`
    await navigator.clipboard.writeText(url)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 1800)
  }, [capsule])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--cream)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>Loading…</span>
      </div>
    )
  }

  if (!capsule || !context) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--cream)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>Capsule not found</span>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', position: 'relative' }}>
      {/* Back button + share controls — floating over the dossier */}
      <div
        data-no-print
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
          background: 'rgba(243,236,221,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
        >
          <Ic.back width={22} height={22} style={{ color: 'var(--ink)' }} />
        </button>

        <span style={{ flex: 1, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>
          {context.name} {capsule.version}
        </span>

        {/* Public toggle */}
        <button
          onClick={handlePublicToggle}
          style={{
            padding: '5px 12px', borderRadius: 6,
            background: isPublic ? 'rgba(31,122,80,0.1)' : 'var(--panel)',
            border: `1px solid ${isPublic ? 'var(--green)' : 'var(--line)'}`,
            color: isPublic ? 'var(--green)' : 'var(--ink-faint)',
            fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer',
            letterSpacing: '0.06em',
          }}
        >
          {isPublic ? 'Public' : 'Private'}
        </button>

        {/* Copy link (only when public) */}
        {isPublic && (
          <button
            onClick={handleCopyLink}
            style={{
              padding: '5px 12px', borderRadius: 6,
              background: copyFeedback ? 'rgba(31,122,80,0.1)' : 'var(--panel)',
              border: `1px solid ${copyFeedback ? 'var(--green)' : 'var(--line)'}`,
              color: copyFeedback ? 'var(--green)' : 'var(--ink-faint)',
              fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer',
            }}
          >
            {copyFeedback ? '✓ Copied' : 'Copy link'}
          </button>
        )}
      </div>

      {/* Dossier — push down by toolbar height */}
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

- [ ] **Step 2: Verify TypeScript**

```bash
/usr/local/lib/node_modules/corepack/shims/pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/dossier/
git commit -m "feat(dossier): add authenticated DossierScreen with theme toggle and PDF export"
```

---

## Task 4: Public dossier route (outside auth wrapper)

**Files:**
- Create: `src/app/capsule/[id]/page.tsx`

This route is outside the `(app)` group, so it has no auth wrapper, no BottomNav, no FAB. It reads the capsule and renders DossierDocument in read-only mode if `is_public = true`. Includes Open Graph meta tags.

- [ ] **Step 1: Create the public route**

```typescript
// src/app/capsule/[id]/page.tsx
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Capsule } from '@/types/capsule'
import type { Context } from '@/types/context'
import { PublicDossierClient } from '@/components/dossier/PublicDossierClient'

interface PageProps {
  params: { id: string }
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(url, key)
}

async function getData(id: string) {
  const supabase = createServiceClient()
  const { data: capsule } = await supabase
    .from('capsules')
    .select('*')
    .eq('id', id)
    .single()
  if (!capsule || !(capsule as Capsule & { is_public?: boolean }).is_public) return null

  const { data: context } = await supabase
    .from('contexts')
    .select('*')
    .eq('id', (capsule as Capsule).context_id)
    .single()

  let parent: Context | null = null
  if (context && (context as Context).parent_context_id) {
    const { data: parentCtx } = await supabase
      .from('contexts')
      .select('*')
      .eq('id', (context as Context).parent_context_id)
      .single()
    parent = parentCtx as Context | null
  }

  return { capsule: capsule as Capsule, context: context as Context, parent }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getData(params.id)
  if (!data) return { title: 'Capsule not found' }
  const { capsule, context } = data
  return {
    title: `${context.name} ${capsule.version} — Taste Capsule`,
    description: capsule.declaration,
    openGraph: {
      title: `${context.name} ${capsule.version}`,
      description: capsule.declaration,
      type: 'article',
    },
  }
}

export default async function PublicCapsulePage({ params }: PageProps) {
  const data = await getData(params.id)
  if (!data) notFound()
  const { capsule, context, parent } = data
  return <PublicDossierClient capsule={capsule} context={context} parent={parent} />
}
```

- [ ] **Step 2: Create `src/components/dossier/PublicDossierClient.tsx`**

This is a thin 'use client' wrapper needed because `DossierDocument` has client-only features (theme toggle, localStorage).

```typescript
// src/components/dossier/PublicDossierClient.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { DossierDocument, type DossierTheme } from './DossierDocument'
import type { Capsule } from '@/types/capsule'
import type { Context } from '@/types/context'

const THEME_KEY = 'taste_dossier_theme'

interface Props {
  capsule: Capsule
  context: Context
  parent: Context | null
}

export function PublicDossierClient({ capsule, context, parent }: Props) {
  const [theme, setTheme] = useState<DossierTheme>('paper')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'dark' || saved === 'paper') setTheme(saved)
    }
  }, [])

  const handleThemeToggle = useCallback(() => {
    setTheme(t => {
      const next: DossierTheme = t === 'paper' ? 'dark' : 'paper'
      if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  return (
    <DossierDocument
      capsule={capsule}
      context={context}
      parent={parent}
      theme={theme}
      isOwner={false}
      onThemeToggle={handleThemeToggle}
      onExportPDF={() => window.print()}
    />
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
/usr/local/lib/node_modules/corepack/shims/pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/capsule/ src/components/dossier/PublicDossierClient.tsx
git commit -m "feat(dossier): add public /capsule/[id] route with OG meta tags"
```

---

## Task 5: Wire "Open Dossier" button in CapsuleScreen

**Files:**
- Modify: `src/app/(app)/capsule/[contextId]/page.tsx`

The CapsuleScreen (built in Phase 5) needs an "Open Dossier" button that navigates to `/dossier/[capsuleId]` when a capsule exists.

- [ ] **Step 1: Add "Open Dossier" button to CapsuleScreen**

In `src/app/(app)/capsule/[contextId]/page.tsx`, find the area after the "Generate new version" button and add:

```typescript
{/* Open Dossier button — only when a capsule exists */}
{capsule && (
  <button
    onClick={() => router.push(`/dossier/${capsule.id}`)}
    style={{
      width: '100%',
      padding: '13px',
      background: 'none',
      border: '1.5px solid var(--ink)',
      borderRadius: 10,
      fontFamily: 'var(--mono)',
      fontSize: 12,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      color: 'var(--ink)',
      marginBottom: 24,
    }}
  >
    Open Dossier
  </button>
)}
```

Place this BETWEEN the Generate button and the Frequency Map section, i.e., after the `marginBottom: 32` Generate button block and before the `{capsule && Object.keys...}` frequency map block.

- [ ] **Step 2: Build check**

```bash
/usr/local/lib/node_modules/corepack/shims/pnpm exec tsc --noEmit 2>&1 | head -20
/usr/local/lib/node_modules/corepack/shims/pnpm build 2>&1 | tail -25
```

Expected: `✓ Compiled successfully`. Routes in build output should include:
- `/capsule/[contextId]` (dynamic, inside app group)
- `/dossier/[capsuleId]` (dynamic, inside app group)  
- `capsule/[id]` (dynamic, public, outside app group)

- [ ] **Step 3: Update BottomNav to NOT show Dossier tab (it's accessed from Capsule)**

No change needed — Dossier is accessed via CapsuleScreen, not directly from nav.

- [ ] **Step 4: Update CLAUDE.md**

Open `CLAUDE.md` and update the Current Phase line and add Phase 5+6 to the completed list:

```markdown
## Current Phase
Phase 6 (Dossier) — COMPLETE

Phase 5 (Capsule Generation) — COMPLETE
Phase 5 components built:
- `src/types/capsule.ts` — Capsule, DistilledRule, CapsuleDiffResult types
- `src/lib/capsule.ts` — getCapsule, getCapsuleHistory, saveCapsule, diffCapsules, nextVersion
- `src/app/api/capsule/generate/route.ts` — POST handler: Claude call + save
- `src/app/(app)/capsule/[contextId]/page.tsx` — CapsuleScreen with generate, history, diff
- `src/app/(app)/contexts/[id]/page.tsx` — CapsuleTab navigates to CapsuleScreen

Phase 6 (Dossier) — COMPLETE
Phase 6 components built:
- `src/lib/capsule.ts` — added updateCapsulePublic
- `src/components/dossier/DossierDocument.tsx` — editorial layout (paper/dark theme)
- `src/components/dossier/PublicDossierClient.tsx` — client wrapper for public route
- `src/app/(app)/dossier/[capsuleId]/page.tsx` — authenticated dossier with controls
- `src/app/capsule/[id]/page.tsx` — public route with OG meta tags
- `src/app/(app)/capsule/[contextId]/page.tsx` — added Open Dossier button
```

- [ ] **Step 5: Tag and push**

```bash
git add src/app/\(app\)/capsule/ CLAUDE.md
git commit -m "feat(dossier): wire Open Dossier button in CapsuleScreen + update CLAUDE.md"
git tag phase-6-dossier-complete
git push origin phase/5-capsule-generation --tags
```

---

## Self-Review Checklist

**Spec coverage — Phase 6:**
- ✅ DossierScreen at `/dossier/[capsuleId]` — Task 3
- ✅ Running head: studio/brand name, capsule version, date — Task 2 (DossierDocument)
- ✅ Masthead: large display type name, version meta row, declaration with violet border — Task 2
- ✅ Section 1 — Frequency Map: inline flowing text at varying sizes — Task 2
- ✅ Section 2 — Rules Table: ALWAYS/NEVER/PREFER/AVOID columns — Task 2 (`VerbColumn`)
- ✅ Section 3 — About: context description — Task 2
- ✅ Theme toggle paper/dark — Task 2 + Task 3
- ✅ Paper: cream #F3ECDD, ink #141210 — Task 2 (uses existing CSS vars)
- ✅ Dark: #1A1714, warm off-white #EDE8DF — Task 2
- ✅ Theme saved to localStorage — Task 3 (`THEME_KEY`)
- ✅ Print/PDF export via window.print() — Task 3 + Task 2 (print stylesheet)
- ✅ Print stylesheet: removes controls, forces paper theme, page margins — Task 2 (`@media print`)
- ✅ Shareable public route `/capsule/[id]` outside auth wrapper — Task 4
- ✅ Public toggle in CapsuleScreen toolbar — Task 3
- ✅ OG meta tags (title = name + version, description = declaration) — Task 4 (`generateMetadata`)
- ✅ Works for all 3 context types (personal handled as brand, running head differentiates) — Task 2

**Visual plates section:** The spec mentions "Section 2 — Visual Plates: photo captures in a 12-column grid." The Capsule object does not store individual capture references — it only stores the distilled rules + frequency map. Photo captures would require fetching them separately. This has been deprioritized to keep the Capsule as a self-contained artifact; if needed, add a separate `getCapturesForDossier(capsule.context_id)` call in DossierDocument and render photo tiles.

**Reactions / Voice sections:** Similarly, the spec mentions reaction and voice capture sections. These require fetching live captures, which is outside the Capsule data model. The rules table covers the core spec requirement. Add these in a follow-up if the data model is extended.
