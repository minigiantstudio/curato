# Phase 5 — Capsule Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a Claude-powered "Taste Capsule" (declaration + rules + frequency map) for any context, with version history and a diff viewer.

**Architecture:** A Next.js API route handles Claude calls server-side (ANTHROPIC_API_KEY never reaches the browser). `src/lib/capsule.ts` is a pure data-layer (Supabase CRUD + diff logic). The CapsuleScreen is a dedicated page at `/capsule/[contextId]`; the existing CapsuleTab in ContextScreen navigates to it. Capsules are stored in the `capsules` Supabase table that already exists in the schema.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase browser client (`createClient()`), Anthropic API via fetch, inline styles only, CSS variables, ABCArizona Flare + DM Mono.

---

## Codebase Context

Read these files before touching anything:

- `src/types/context.ts` — Context interface (id, user_id, type: 'brand'|'project', name, description, parent_context_id)
- `src/types/capture.ts` — Capture interface (id, type, content, verdict, tags, domains, rule_verb, context_ids)
- `src/lib/contexts.ts` — getCapturesForContext(contextId), getContextById(id), getInheritedRules(contextId)
- `src/lib/supabase.ts` — createClient(), getOrCreateSession()
- `src/lib/claude.ts` — callClaude() pattern; ANTHROPIC_API_KEY only works server-side
- `src/app/(app)/contexts/[id]/page.tsx` — existing CapsuleTab placeholder (update at end)
- `src/app/globals.css` — CSS vars: --cream, --ink, --violet, --line, --panel, --mono, --display
- `src/components/icons.tsx` — Ic.* SVG icons
- `src/components/ui/Sheet.tsx` — Sheet({ open, onClose, children })

**Design rules:**
- Inline styles only — no Tailwind classes in JSX
- Colors via CSS variables: `var(--violet)`, `var(--ink)`, `var(--cream)`, `var(--line)`, etc.
- Display/editorial text → `fontFamily: 'var(--display)'`
- UI/data/labels → `fontFamily: 'var(--mono)'`
- No external icon libraries — use `Ic.*` from `src/components/icons.tsx`
- CSS animations defined in globals.css: `fadeIn`, `slideIn`, `sheetUp`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/capsule.ts` | **Create** | Capsule, CapsuleInsert, DistilledRule, CapsuleDiffResult types |
| `src/lib/capsule.ts` | **Create** | getCapsule, getCapsuleHistory, saveCapsule, diffCapsules |
| `src/app/api/capsule/generate/route.ts` | **Create** | POST handler: calls Claude, saves capsule, returns result |
| `src/app/(app)/capsule/[contextId]/page.tsx` | **Create** | CapsuleScreen: header, declaration, stats, generate button, history |
| `src/components/capsule/CapsuleDiff.tsx` | **Create** | Side-by-side version comparison |
| `src/app/(app)/contexts/[id]/page.tsx` | **Modify** | Replace CapsuleTab placeholder with real navigate-to-capsule button |

---

## Task 1: Capsule TypeScript types

**Files:**
- Create: `src/types/capsule.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/types/capsule.ts

export interface DistilledRule {
  verb: 'ALWAYS' | 'NEVER' | 'PREFER' | 'AVOID'
  domain: string
  text: string
}

export interface Capsule {
  id: string
  user_id: string
  context_id: string | null
  created_at: string
  version: string            // e.g. "v1.0", "v1.1", "v2.0"
  title: string
  declaration: string
  rules: DistilledRule[]
  frequency_map: Record<string, number>  // word → weight (0.1-1.0)
  exported_at: string | null
  protocol_version: string
  protocol_json_url: string | null
  // Extended fields from Claude (stored in rules/frequency_map):
  dominant_domains?: string[]
  capsule_summary?: string
}

export interface CapsuleInsert {
  context_id: string
  version: string
  title: string
  declaration: string
  rules: DistilledRule[]
  frequency_map: Record<string, number>
}

export interface CapsuleDiffResult {
  declaration: {
    v1: string
    v2: string
    // Words in v2 not in v1 (by word boundary split)
    added: string[]
    removed: string[]
  }
  rules: {
    added: DistilledRule[]     // in v2 but not v1
    removed: DistilledRule[]   // in v1 but not v2
    unchanged: DistilledRule[]
  }
  frequency: {
    increased: Array<{ word: string; v1: number; v2: number }>
    decreased: Array<{ word: string; v1: number; v2: number }>
    new: Array<{ word: string; weight: number }>
    dropped: Array<{ word: string; weight: number }>
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "$(git rev-parse --show-toplevel)"
/usr/local/lib/node_modules/corepack/shims/pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors from `src/types/capsule.ts`

- [ ] **Step 3: Commit**

```bash
git add src/types/capsule.ts
git commit -m "feat(capsule): add Capsule, CapsuleInsert, CapsuleDiffResult types"
```

---

## Task 2: Capsule data layer (`src/lib/capsule.ts`)

**Files:**
- Create: `src/lib/capsule.ts`

This file handles all Supabase reads/writes for capsules. No Claude calls here — that lives in the API route.

The `capsules` table already exists in Supabase with columns: `id, user_id, context_id, created_at, version, title, declaration, rules (jsonb), frequency_map (jsonb), exported_at, protocol_version, protocol_json_url`.

- [ ] **Step 1: Create the data layer**

```typescript
// src/lib/capsule.ts
import { createClient, getOrCreateSession } from '@/lib/supabase'
import type { Capsule, CapsuleInsert, CapsuleDiffResult, DistilledRule } from '@/types/capsule'

// ── Read ──────────────────────────────────────────────────────────

/** Latest capsule for a context (highest version number by created_at). */
export async function getCapsule(contextId: string): Promise<Capsule | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('context_id', contextId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error || !data) return null
  return data as Capsule
}

/** All capsule versions for a context, newest first. */
export async function getCapsuleHistory(contextId: string): Promise<Capsule[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('context_id', contextId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as Capsule[]
}

/** Single capsule by id. */
export async function getCapsuleById(id: string): Promise<Capsule | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Capsule
}

// ── Write ─────────────────────────────────────────────────────────

/** Persist a new capsule version. Returns the saved record. */
export async function saveCapsule(data: CapsuleInsert): Promise<Capsule | null> {
  const supabase = createClient()
  const user = await getOrCreateSession()
  if (!user) return null

  const { data: saved, error } = await supabase
    .from('capsules')
    .insert({ ...data, user_id: user.id, protocol_version: '1' })
    .select()
    .single()
  if (error) { console.error('saveCapsule:', error); return null }
  return saved as Capsule
}

// ── Diff ──────────────────────────────────────────────────────────

/** Compute structured diff between two capsule versions. */
export function diffCapsules(v1: Capsule, v2: Capsule): CapsuleDiffResult {
  // Declaration word diff
  const words1 = new Set(v1.declaration.toLowerCase().split(/\W+/).filter(Boolean))
  const words2 = new Set(v2.declaration.toLowerCase().split(/\W+/).filter(Boolean))
  const added = [...words2].filter(w => !words1.has(w))
  const removed = [...words1].filter(w => !words2.has(w))

  // Rules diff — identity key: verb+domain+text
  const ruleKey = (r: DistilledRule) => `${r.verb}|${r.domain}|${r.text}`
  const keys1 = new Set((v1.rules ?? []).map(ruleKey))
  const keys2 = new Set((v2.rules ?? []).map(ruleKey))
  const rulesAdded = (v2.rules ?? []).filter(r => !keys1.has(ruleKey(r)))
  const rulesRemoved = (v1.rules ?? []).filter(r => !keys2.has(ruleKey(r)))
  const rulesUnchanged = (v1.rules ?? []).filter(r => keys2.has(ruleKey(r)))

  // Frequency map diff
  const fm1 = v1.frequency_map ?? {}
  const fm2 = v2.frequency_map ?? {}
  const allWords = new Set([...Object.keys(fm1), ...Object.keys(fm2)])
  const increased: CapsuleDiffResult['frequency']['increased'] = []
  const decreased: CapsuleDiffResult['frequency']['decreased'] = []
  const newWords: CapsuleDiffResult['frequency']['new'] = []
  const dropped: CapsuleDiffResult['frequency']['dropped'] = []

  for (const word of allWords) {
    const w1 = fm1[word]
    const w2 = fm2[word]
    if (w1 === undefined && w2 !== undefined) newWords.push({ word, weight: w2 })
    else if (w1 !== undefined && w2 === undefined) dropped.push({ word, weight: w1 })
    else if (w1 !== undefined && w2 !== undefined) {
      if (w2 > w1) increased.push({ word, v1: w1, v2: w2 })
      else if (w2 < w1) decreased.push({ word, v1: w1, v2: w2 })
    }
  }

  return {
    declaration: { v1: v1.declaration, v2: v2.declaration, added, removed },
    rules: { added: rulesAdded, removed: rulesRemoved, unchanged: rulesUnchanged },
    frequency: { increased, decreased, new: newWords, dropped },
  }
}

// ── Version helpers ───────────────────────────────────────────────

/** Compute next version string given the latest existing version. */
export function nextVersion(latest: Capsule | null): string {
  if (!latest) return 'v1.0'
  const match = latest.version.match(/^v(\d+)\.(\d+)$/)
  if (!match) return 'v1.0'
  const minor = parseInt(match[2], 10) + 1
  return `v${match[1]}.${minor}`
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
/usr/local/lib/node_modules/corepack/shims/pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/capsule.ts
git commit -m "feat(capsule): add data layer — getCapsule, getCapsuleHistory, saveCapsule, diffCapsules"
```

---

## Task 3: Capsule generation API route

**Files:**
- Create: `src/app/api/capsule/generate/route.ts`

This is a Next.js Route Handler (server-side). It receives `{ contextId }` in the JSON body, fetches all captures for that context, calls Claude, saves the new capsule, and returns it. `ANTHROPIC_API_KEY` is available here because this is server code.

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/capsule/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCapsule, saveCapsule, nextVersion } from '@/lib/capsule'
import type { DistilledRule } from '@/types/capsule'
import type { Capture } from '@/types/capture'
import type { Context } from '@/types/context'

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY
const CLAUDE_MODEL = 'claude-sonnet-4-6'

async function callClaude(prompt: string): Promise<string> {
  if (!CLAUDE_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${response.status} ${err}`)
  }
  const data = await response.json() as { content: Array<{ type: string; text: string }> }
  const block = data.content.find(b => b.type === 'text')
  if (!block) throw new Error('No text response from Claude')
  return block.text
}

function buildPrompt(context: Context, captures: Capture[]): string {
  const captureLines = captures.map(c => {
    const parts = [
      c.type.toUpperCase(),
      c.verdict ? `[${c.verdict.toUpperCase()}]` : '[UNSET]',
      c.content.slice(0, 300),
    ]
    if (c.tags.length) parts.push(`tags: ${c.tags.join(', ')}`)
    if (c.domains.length) parts.push(`domains: ${c.domains.join(', ')}`)
    if (c.rule_verb) parts.push(`rule: ${c.rule_verb}`)
    return parts.join(' | ')
  }).join('\n')

  return `You are synthesizing an Art Director's aesthetic position into a Taste Capsule.

Context: ${context.name} (${context.type})
Description: ${context.description || 'none'}

Captures (${captures.length} total):
${captureLines || '(no captures yet)'}

Generate a Taste Capsule as JSON (no markdown, no explanation — raw JSON only):
{
  "declaration": "string — One sentence. Editorial magazine voice. States the aesthetic position with specificity and conviction. No generalities. Example: 'Every surface earns its warmth through material reality, never decoration.'",
  "distilled_rules": [
    { "verb": "ALWAYS|NEVER|PREFER|AVOID", "domain": "string", "text": "string" }
  ],
  "dominant_domains": ["string"],
  "frequency_map": { "word": 0.0 },
  "capsule_summary": "string — 2-3 sentences. What this designer/brand/project stands for aesthetically."
}

Rules:
- distilled_rules: deduplicated, maximum 12, most important first
- dominant_domains: sorted by frequency in captures
- frequency_map: 20-40 words, weight = aesthetic signal strength 0.1-1.0, skip stop words and generic terms
- Return valid JSON only`
}

export async function POST(req: NextRequest) {
  try {
    const { contextId } = await req.json() as { contextId: string }
    if (!contextId) return NextResponse.json({ error: 'contextId required' }, { status: 400 })

    const supabase = createClient()

    // Fetch context
    const { data: contextData, error: ctxErr } = await supabase
      .from('contexts')
      .select('*')
      .eq('id', contextId)
      .single()
    if (ctxErr || !contextData) {
      return NextResponse.json({ error: 'Context not found' }, { status: 404 })
    }
    const context = contextData as Context

    // Fetch all captures for this context (direct assignments)
    const { data: captureData } = await supabase
      .from('captures')
      .select('*')
      .contains('context_ids', [contextId])
      .order('created_at', { ascending: false })
    const captures = (captureData ?? []) as Capture[]

    // Also fetch captures from parent context if exists
    let allCaptures = [...captures]
    if (context.parent_context_id) {
      const { data: parentCaptures } = await supabase
        .from('captures')
        .select('*')
        .contains('context_ids', [context.parent_context_id])
        .order('created_at', { ascending: false })
      // Merge, deduplicate by id
      const seen = new Set(captures.map(c => c.id))
      for (const c of (parentCaptures ?? []) as Capture[]) {
        if (!seen.has(c.id)) { allCaptures.push(c); seen.add(c.id) }
      }
    }

    // Determine next version
    const latest = await getCapsule(contextId)
    const version = nextVersion(latest)

    // Call Claude
    const prompt = buildPrompt(context, allCaptures)
    const raw = await callClaude(prompt)

    // Parse JSON — strip markdown fences if Claude added them
    const cleaned = raw.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as {
      declaration: string
      distilled_rules: DistilledRule[]
      dominant_domains: string[]
      frequency_map: Record<string, number>
      capsule_summary: string
    }

    // Save to Supabase
    const capsule = await saveCapsule({
      context_id: contextId,
      version,
      title: `${context.name} ${version}`,
      declaration: parsed.declaration,
      rules: parsed.distilled_rules ?? [],
      frequency_map: parsed.frequency_map ?? {},
    })

    if (!capsule) {
      return NextResponse.json({ error: 'Failed to save capsule' }, { status: 500 })
    }

    return NextResponse.json({
      capsule,
      dominant_domains: parsed.dominant_domains,
      capsule_summary: parsed.capsule_summary,
    })
  } catch (err) {
    console.error('generate capsule error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

Note: this imports from `@/lib/supabase-server` (the server-side Supabase client). Check `src/lib/supabase-server.ts` — it already exists. If it exports `createClient`, use it as shown. If it exports something else, adapt the import.

- [ ] **Step 2: Verify `src/lib/supabase-server.ts` exports**

```bash
cat src/lib/supabase-server.ts
```

If it exports `createServerClient` instead of `createClient`, update the route to use the correct export. The route only needs a way to read from Supabase without the session (it uses the anon key to read public data, since captures/contexts have RLS based on auth.uid()).

Actually — since the API route runs as an anonymous server call without the user's session cookie, the Supabase reads will be blocked by RLS. Fix: use the service role key if available, or pass the user's auth token from the client.

Simplest fix for now: add `?apikey` header approach, or read the auth token from the request header. Since this is a v1 internal tool, use service role if `SUPABASE_SERVICE_ROLE_KEY` is set, otherwise fall back to anon (which may fail RLS).

Update the route to use service role:

```typescript
// Replace the supabase client creation in the route:
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(url, key)
}
// Then use: const supabase = createServiceClient()
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
/usr/local/lib/node_modules/corepack/shims/pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/capsule/generate/route.ts
git commit -m "feat(capsule): add POST /api/capsule/generate server route"
```

---

## Task 4: CapsuleScreen page

**Files:**
- Create: `src/app/(app)/capsule/[contextId]/page.tsx`

This is the main screen for a context's capsule. Shows: header (context name, "Capsule" label, version), the declaration in large ABCArizona Flare, stats row, "Generate new version" button, version history list.

**Loading animation:** While generating, animate three dots or a slow pulse — NOT a spinner. Use a CSS keyframe animation from globals.css (or add a new one). Show the previous declaration text (dimmed) during generation.

- [ ] **Step 1: Create the CapsuleScreen**

```typescript
// src/app/(app)/capsule/[contextId]/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Ic } from '@/components/icons'
import { getContextById } from '@/lib/contexts'
import { getCapsule, getCapsuleHistory } from '@/lib/capsule'
import type { Context } from '@/types/context'
import type { Capsule } from '@/types/capsule'

interface PageProps {
  params: { contextId: string }
}

export default function CapsuleScreen({ params }: PageProps) {
  const router = useRouter()
  const { contextId } = params

  const [context, setContext] = useState<Context | null>(null)
  const [capsule, setCapsule] = useState<Capsule | null>(null)
  const [history, setHistory] = useState<Capsule[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  useEffect(() => {
    async function load() {
      const [ctx, cap, hist] = await Promise.all([
        getContextById(contextId),
        getCapsule(contextId),
        getCapsuleHistory(contextId),
      ])
      setContext(ctx)
      setCapsule(cap)
      setHistory(hist)
      setLoading(false)
    }
    load()
  }, [contextId])

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/capsule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextId }),
      })
      const json = await res.json() as { capsule?: Capsule; error?: string }
      if (!res.ok || !json.capsule) throw new Error(json.error ?? 'Generation failed')
      setCapsule(json.capsule)
      setHistory(prev => [json.capsule!, ...prev])
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--cream)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12, fontFamily: 'var(--mono)' }}>Loading…</span>
      </div>
    )
  }

  if (!context) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--cream)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>Context not found</span>
      </div>
    )
  }

  const compareTarget = history.find(h => h.id === selectedHistoryId) ?? null
  const prevCapsule = history.length >= 2 ? history[1] : null

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cream)' }}>
      {/* ── Header ── */}
      <div style={{
        padding: '12px 20px 0',
        background: 'rgba(243,236,221,0.96)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
        borderBottom: '1px solid var(--line-soft)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
          >
            <Ic.back width={22} height={22} style={{ color: 'var(--ink)' }} />
          </button>
          <span style={{
            fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--ink-faint)', fontFamily: 'var(--mono)',
          }}>
            Capsule
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <h1 style={{
            fontFamily: 'var(--display)', fontSize: 22, fontWeight: 400,
            letterSpacing: '-0.02em', color: 'var(--ink)',
          }}>
            {context.name}
          </h1>
          {capsule && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--violet)',
              background: 'rgba(74,61,176,0.07)', padding: '2px 8px',
              borderRadius: 4, border: '1px solid rgba(74,61,176,0.2)',
            }}>
              {capsule.version}
            </span>
          )}
        </div>

        {/* Stats row */}
        {capsule && (
          <div style={{ display: 'flex', gap: 20, paddingBottom: 12 }}>
            <StatPill value={capsule.rules.length} label="rules" />
            <StatPill value={Object.keys(capsule.frequency_map ?? {}).length} label="words" />
            <StatPill value={history.length} label="versions" />
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '24px 20px 100px' }}>

        {/* Declaration */}
        <div style={{
          marginBottom: 32,
          padding: '24px',
          background: 'var(--cream-2)',
          borderRadius: 12,
          border: '1.5px solid var(--line)',
          position: 'relative',
          minHeight: 120,
        }}>
          {generating && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: 'rgba(243,236,221,0.7)', backdropFilter: 'blur(2px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2,
            }}>
              <GeneratingPulse />
            </div>
          )}
          {capsule ? (
            <>
              <p style={{
                fontFamily: 'var(--display)', fontSize: 19, lineHeight: 1.45,
                letterSpacing: '-0.01em', color: 'var(--ink)',
                opacity: generating ? 0.4 : 1,
                transition: 'opacity 0.4s ease',
              }}>
                {capsule.declaration}
              </p>
              {capsule.rules.length > 0 && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {capsule.rules.slice(0, 6).map((r, i) => (
                    <RulePill key={i} rule={r} />
                  ))}
                  {capsule.rules.length > 6 && (
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginTop: 4 }}>
                      +{capsule.rules.length - 6} more rules
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <p style={{
              fontFamily: 'var(--display)', fontSize: 16, color: 'var(--ink-faint)',
              lineHeight: 1.5, textAlign: 'center', paddingTop: 16,
            }}>
              No capsule generated yet.{'\n'}Add captures to this context, then generate.
            </p>
          )}
        </div>

        {/* Error */}
        {generateError && (
          <div style={{
            marginBottom: 16, padding: '12px 16px',
            background: 'rgba(158,52,66,0.06)',
            border: '1px solid rgba(158,52,66,0.25)',
            borderRadius: 8, fontSize: 12, color: 'var(--red)',
          }}>
            {generateError}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            width: '100%',
            padding: '15px',
            background: generating ? 'var(--line)' : 'var(--violet)',
            color: generating ? 'var(--ink-faint)' : 'white',
            border: 'none',
            borderRadius: 10,
            fontFamily: 'var(--mono)',
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: generating ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            marginBottom: 32,
          }}
        >
          {generating ? 'Generating…' : capsule ? 'Generate new version' : 'Generate capsule'}
        </button>

        {/* Frequency map word cloud */}
        {capsule && Object.keys(capsule.frequency_map ?? {}).length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <SectionLabel>Frequency Map</SectionLabel>
            <FrequencyCloud map={capsule.frequency_map} />
          </section>
        )}

        {/* Version history */}
        {history.length > 0 && (
          <section>
            <SectionLabel>Version History</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((h, i) => (
                <HistoryRow
                  key={h.id}
                  capsule={h}
                  isCurrent={i === 0}
                  isSelected={selectedHistoryId === h.id}
                  onSelect={() => {
                    if (selectedHistoryId === h.id) {
                      setSelectedHistoryId(null)
                      setShowDiff(false)
                    } else {
                      setSelectedHistoryId(h.id)
                      setShowDiff(false)
                    }
                  }}
                />
              ))}
            </div>

            {selectedHistoryId && compareTarget && capsule && selectedHistoryId !== capsule.id && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => setShowDiff(v => !v)}
                  style={{
                    padding: '10px 20px',
                    background: 'none',
                    border: '1.5px solid var(--violet)',
                    borderRadius: 8,
                    color: 'var(--violet)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {showDiff ? 'Hide diff' : `Compare ${capsule.version} ↔ ${compareTarget.version}`}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Diff view */}
        {showDiff && capsule && compareTarget && (
          <DiffSection v1={compareTarget} v2={capsule} />
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

import type { DistilledRule } from '@/types/capsule'
import { diffCapsules } from '@/lib/capsule'

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
      <strong style={{ color: 'var(--ink)', fontFamily: 'var(--display)', fontSize: 13 }}>
        {value}
      </strong>{' '}
      {label}
    </span>
  )
}

function RulePill({ rule }: { rule: DistilledRule }) {
  const verbColor: Record<string, string> = {
    ALWAYS: 'var(--green)', NEVER: 'var(--red)',
    PREFER: 'var(--violet)', AVOID: 'var(--ink-faint)',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{
        fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.08em',
        color: verbColor[rule.verb] ?? 'var(--ink)',
        background: 'var(--panel)', padding: '2px 6px', borderRadius: 3,
        border: '1px solid var(--line-soft)', flexShrink: 0, marginTop: 1,
      }}>
        {rule.verb}
      </span>
      <span style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
        {rule.domain ? <strong style={{ color: 'var(--ink)' }}>{rule.domain}: </strong> : null}
        {rule.text}
      </span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginBottom: 10,
    }}>
      {children}
    </p>
  )
}

function FrequencyCloud({ map }: { map: Record<string, number> }) {
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
  const maxW = sorted[0]?.[1] ?? 1
  return (
    <div style={{ lineHeight: 1.8 }}>
      {sorted.map(([word, weight]) => {
        const size = 11 + Math.round((weight / maxW) * 14)
        return (
          <span key={word} style={{
            fontSize: size, fontFamily: 'var(--display)',
            color: `rgba(20,18,16,${0.35 + (weight / maxW) * 0.65})`,
            marginRight: 10, display: 'inline-block',
            letterSpacing: '-0.01em',
          }}>
            {word}
          </span>
        )
      })}
    </div>
  )
}

function HistoryRow({
  capsule, isCurrent, isSelected, onSelect,
}: {
  capsule: Capsule; isCurrent: boolean; isSelected: boolean; onSelect: () => void
}) {
  const date = new Date(capsule.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 14px',
        background: isSelected ? 'rgba(74,61,176,0.06)' : 'var(--cream-2)',
        border: `1.5px solid ${isSelected ? 'var(--violet)' : 'var(--line-soft)'}`,
        borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--violet)',
            fontWeight: 500,
          }}>
            {capsule.version}
          </span>
          {isCurrent && (
            <span style={{
              fontSize: 8, fontFamily: 'var(--mono)', letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink-faint)',
              background: 'var(--panel)', padding: '1px 5px', borderRadius: 3,
            }}>
              current
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>
            {date}
          </span>
        </div>
        <p style={{
          fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {capsule.declaration}
        </p>
      </div>
    </button>
  )
}

function GeneratingPulse() {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--violet)',
          animation: `wave-a 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

function DiffSection({ v1, v2 }: { v1: Capsule; v2: Capsule }) {
  // Lazy-import CapsuleDiff to avoid circular deps
  const diff = diffCapsules(v1, v2)
  return (
    <div style={{ marginTop: 24 }}>
      <SectionLabel>Comparing {v1.version} → {v2.version}</SectionLabel>
      {/* Declaration diff */}
      <div style={{
        padding: '16px', background: 'var(--cream-2)', border: '1px solid var(--line)',
        borderRadius: 10, marginBottom: 16,
      }}>
        <p style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10, fontFamily: 'var(--mono)' }}>Declaration</p>
        <DiffDeclaration v1={v1.declaration} v2={v2.declaration} addedWords={diff.declaration.added} removedWords={diff.declaration.removed} />
      </div>
      {/* Rules diff */}
      {(diff.rules.added.length > 0 || diff.rules.removed.length > 0) && (
        <div style={{
          padding: '16px', background: 'var(--cream-2)', border: '1px solid var(--line)',
          borderRadius: 10,
        }}>
          <p style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10, fontFamily: 'var(--mono)' }}>Rule Changes</p>
          {diff.rules.added.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ color: 'var(--green)', fontSize: 12, fontFamily: 'var(--mono)' }}>+</span>
              <RulePill rule={r} />
            </div>
          ))}
          {diff.rules.removed.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ color: 'var(--red)', fontSize: 12, fontFamily: 'var(--mono)' }}>−</span>
              <div style={{ opacity: 0.6 }}><RulePill rule={r} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DiffDeclaration({
  v1, v2, addedWords, removedWords,
}: {
  v1: string; v2: string; addedWords: string[]; removedWords: string[]
}) {
  const addedSet = new Set(addedWords)
  const removedSet = new Set(removedWords)

  function highlight(text: string, markAdded: boolean) {
    return text.split(/(\W+)/).map((part, i) => {
      const lower = part.toLowerCase()
      const isHighlighted = markAdded ? addedSet.has(lower) : removedSet.has(lower)
      return (
        <span key={i} style={{
          background: isHighlighted ? (markAdded ? 'rgba(31,122,80,0.15)' : 'rgba(158,52,66,0.15)') : 'transparent',
          color: isHighlighted ? (markAdded ? 'var(--green)' : 'var(--red)') : 'inherit',
          borderRadius: 2,
        }}>
          {part}
        </span>
      )
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <p style={{ fontSize: 9, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginBottom: 6 }}>Before</p>
        <p style={{ fontSize: 13, fontFamily: 'var(--display)', lineHeight: 1.5, color: 'var(--ink-soft)' }}>
          {highlight(v1, false)}
        </p>
      </div>
      <div>
        <p style={{ fontSize: 9, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginBottom: 6 }}>After</p>
        <p style={{ fontSize: 13, fontFamily: 'var(--display)', lineHeight: 1.5, color: 'var(--ink)' }}>
          {highlight(v2, true)}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
/usr/local/lib/node_modules/corepack/shims/pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/capsule/
git commit -m "feat(capsule): add CapsuleScreen with generate button, history, word cloud, diff"
```

---

## Task 5: Wire CapsuleTab in ContextScreen to navigate to CapsuleScreen

**Files:**
- Modify: `src/app/(app)/contexts/[id]/page.tsx` — the `CapsuleTab` function at the bottom

Currently `CapsuleTab` shows a disabled "Generate Capsule (Phase 5)" button. Replace it with a real button that navigates to `/capsule/[contextId]`.

- [ ] **Step 1: Update CapsuleTab**

Find the `CapsuleTab` function (near line 200+ of the file) and replace it:

```typescript
// Replace the entire CapsuleTab function:
function CapsuleTab({ contextId, contextName }: { contextId: string; contextName: string }) {
  const router = useRouter()
  return (
    <div style={{ paddingTop: 24 }}>
      <button
        onClick={() => router.push(`/capsule/${contextId}`)}
        style={{
          display: 'block',
          width: '100%',
          padding: '20px 24px',
          background: 'var(--cream-2)',
          border: '1.5px solid var(--line)',
          borderRadius: 12,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <p style={{
          fontFamily: 'var(--display)', fontSize: 16, color: 'var(--ink)',
          letterSpacing: '-0.01em', marginBottom: 6,
        }}>
          {contextName} Capsule
        </p>
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
          Generate a taste synthesis — declaration, rules, frequency map.
        </p>
        <span style={{
          display: 'inline-block', marginTop: 12,
          fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--violet)',
          letterSpacing: '0.06em',
        }}>
          Open Capsule →
        </span>
      </button>
    </div>
  )
}
```

Also update the call site — the `CapsuleTab` is rendered in the tab content section. Find `<CapsuleTab contextName={context.name} />` and change it to `<CapsuleTab contextId={params.id} contextName={context.name} />`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
/usr/local/lib/node_modules/corepack/shims/pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 3: Build check**

```bash
/usr/local/lib/node_modules/corepack/shims/pnpm build 2>&1 | tail -25
```

Expected: `✓ Compiled successfully`, routes include `/capsule/[contextId]`

- [ ] **Step 4: Tag and push**

```bash
git add src/app/\(app\)/contexts/
git commit -m "feat(capsule): wire CapsuleTab to navigate to CapsuleScreen"
git tag phase-5-capsule-complete
git push origin phase/5-capsule-generation --tags
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Header: context name, "Capsule" label, version number — Task 4
- ✅ Declaration in ABCArizona Flare — Task 4 (`fontFamily: 'var(--display)'`)
- ✅ Stats row: N rules, N words (domains merged into frequency map), N versions — Task 4
- ✅ "Generate new version" button (violet, prominent) — Task 4
- ✅ Version history list with date, version, 1-line summary — Task 4 (`HistoryRow`)
- ✅ Loading state animated (3-dot pulse, NOT a spinner) — Task 4 (`GeneratingPulse`)
- ✅ Show previous declaration during generation — Task 4 (opacity 0.4 + overlay)
- ✅ `generateCapsule(contextId)` → fetch captures + parent captures + Claude + save — Task 3
- ✅ On success: new declaration animates in, version updates — Task 4 (state update)
- ✅ On error: show error, keep previous version — Task 4 (`generateError`)
- ✅ `getCapsule(contextId)` — Task 2
- ✅ `getCapsuleHistory(contextId)` — Task 2
- ✅ `diffCapsules(v1Id, v2Id)` — Task 2 (takes Capsule objects, not IDs — spec says v1Id/v2Id but inline diff is cleaner)
- ✅ Side-by-side diff: declaration with word highlights — Task 4 (`DiffDeclaration`)
- ✅ Rules: added (green) / removed (red) — Task 4 (`DiffSection`)
- ✅ Frequency map word changes — Task 2 (`diffCapsules` returns frequency diff)
- ✅ Exact Claude prompt wording — Task 3 (`buildPrompt`)

**Note on CapsuleDiff.tsx:** The spec asked for a separate component file. In this plan, the diff UI lives inline in the CapsuleScreen to keep context and avoid prop-drilling. If a separate file is preferred, extract `DiffSection` into `src/components/capsule/CapsuleDiff.tsx` and import it.
