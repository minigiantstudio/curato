# Curato Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Feed screen with the Curato Home dashboard, rename the app from "Taste" to "Curato", add new design-system tokens, and insert a Recents strip into the Library.

**Architecture:** `HomeScreen` orchestrates all data-fetching in a single `useEffect` (latest capsule via Supabase browser client, stats via `GET /api/capsule/stats`, today/total capture counts via Supabase). `CapsuleWidget`, `StepRail`, and `ExportSheet` are display-only components that receive props from `HomeScreen` — they make no network calls themselves.

**Tech Stack:** Next.js 14 App Router, Supabase browser client (RLS-scoped), `@/lib/supabase-server` for API route auth, ABCArizona Flare + DM Mono design tokens, CSS variables from `globals.css`.

**Design reference:** `/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/UI/Taste-handoff/taste/project/Curato Home.html`

**Spec reference:** `docs/superpowers/specs/2026-06-23-curato-home-design.md`

---

## File map

| Action | File |
|--------|------|
| Modify | `src/app/layout.tsx` |
| Modify | `src/app/login/page.tsx` |
| Modify | `CLAUDE.md` |
| Modify | `src/app/globals.css` |
| Modify | `src/components/icons.tsx` |
| Modify | `src/lib/guidelines-generator.ts` |
| Create | `src/app/api/capsule/stats/route.ts` |
| Create | `src/components/home/CapsuleWidget.tsx` |
| Create | `src/components/home/StepRail.tsx` |
| Create | `src/components/home/ExportSheet.tsx` |
| Replace | `src/app/(app)/feed/page.tsx` |
| Modify | `src/app/(app)/library/page.tsx` |

---

### Task 1: Branding rename

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rename in layout.tsx**

  Open `src/app/layout.tsx`. Find the metadata object and change the `title` and `description` fields:

  ```ts
  // Before:
  title: 'Taste',
  description: 'Art Director capture and taste synthesis',

  // After:
  title: 'Curato',
  description: 'Visual intelligence capture and synthesis',
  ```

- [ ] **Step 2: Rename in login/page.tsx**

  Open `src/app/login/page.tsx`. Find the `<h1>` element showing the app name and change it:

  ```tsx
  // Before:
  <h1>Taste</h1>

  // After:
  <h1>Curato</h1>
  ```

  If the h1 has additional styling props, preserve them — only change the text content.

- [ ] **Step 3: Rename in CLAUDE.md**

  Open `CLAUDE.md`. Make these three changes:

  1. Top heading: `# Taste App` → `# Curato`
  2. Subtitle line (if present): `Art Director capture and taste synthesis tool.` → `Visual intelligence capture and synthesis tool.`
  3. Design system section — add the new sharp-corner rule after the Fonts line:

  ```markdown
  - Sharp corners: new Curato components use `borderRadius: 0` on primary buttons and cards
  ```

- [ ] **Step 4: Verify TypeScript**

  ```bash
  cd "/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/taste"
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/layout.tsx src/app/login/page.tsx CLAUDE.md
  git commit -m "feat: rename app from Taste to Curato"
  ```

---

### Task 2: Design system additions

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/icons.tsx`

- [ ] **Step 1: Add keyframe animations to globals.css**

  Open `src/app/globals.css`. Find the existing `@keyframes` block (e.g., near `slideIn`, `sheetUp`). Add the two missing keyframes right after the existing ones:

  ```css
  @keyframes fadeUp {
    from { transform: translateY(10px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  @keyframes growW {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  ```

  Do NOT remove or modify the existing keyframes (`slideIn`, `sheetUp`, `fadeIn`, `tagPop`, `pulse`, `wave-a/b/c/d`).

- [ ] **Step 2: Add Ic.mark to icons.tsx**

  Open `src/components/icons.tsx`.

  **2a** — Add `CSSProperties` to the React import at line 1:

  ```ts
  // Before:
  import type { SVGProps } from 'react'

  // After:
  import type { SVGProps, CSSProperties } from 'react'
  ```

  **2b** — Find the last icon in the `Ic` object (`arrowOut`) and add `mark` after it, before the closing `}`:

  ```tsx
  // After arrowOut definition, before the closing }:
  mark: ({ s = 20, style }: { s?: number; style?: CSSProperties }) => (
    <div style={{
      width: s, height: s,
      border: '1.5px solid var(--violet)',
      borderRadius: '50%',
      position: 'relative',
      flexShrink: 0,
      ...style,
    }}>
      <span style={{
        position: 'absolute',
        inset: s * 0.22,
        borderRadius: '50%',
        background: 'var(--violet)',
      }} />
    </div>
  ),
  ```

- [ ] **Step 3: Verify TypeScript**

  ```bash
  cd "/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/taste"
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/globals.css src/components/icons.tsx
  git commit -m "feat: add fadeUp/growW keyframes and Ic.mark icon"
  ```

---

### Task 3: entryCount + GET /api/capsule/stats route

**Files:**
- Modify: `src/lib/guidelines-generator.ts`
- Create: `src/app/api/capsule/stats/route.ts`

- [ ] **Step 1: Add entryCount to CapsuleStats**

  Open `src/lib/guidelines-generator.ts`. Find the `CapsuleStats` interface (around line 154):

  ```ts
  // Before:
  export interface CapsuleStats {
    approvedTags: ApprovedTagStat[]
    rejectionPatterns: RejectionPatternStat[]
    antiSlopScore: number
    trainingDays: number
  }

  // After:
  export interface CapsuleStats {
    approvedTags: ApprovedTagStat[]
    rejectionPatterns: RejectionPatternStat[]
    antiSlopScore: number
    trainingDays: number
    entryCount: number
  }
  ```

- [ ] **Step 2: Populate entryCount in fetchCapsuleStats**

  In `fetchCapsuleStats`, find the `return` statement at the bottom of the function (around line 248). Add `entryCount` to both the `empty` object and the final return:

  ```ts
  // Change the empty object (around line 184):
  const empty: CapsuleStats = {
    approvedTags: [], rejectionPatterns: [], antiSlopScore: 0, trainingDays: 0, entryCount: 0,
  }

  // Change the final return (the last return in the function):
  return { approvedTags, rejectionPatterns, antiSlopScore, trainingDays, entryCount: approved.length + rejected.length }
  ```

- [ ] **Step 3: Create the stats API route**

  Create `src/app/api/capsule/stats/route.ts`:

  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { createServerSupabaseClient } from '@/lib/supabase-server'
  import { fetchCapsuleStats } from '@/lib/guidelines-generator'

  export async function GET(req: NextRequest) {
    const capsuleId = req.nextUrl.searchParams.get('capsuleId')
    if (!capsuleId) return NextResponse.json({ error: 'capsuleId required' }, { status: 400 })

    const authed = await createServerSupabaseClient()
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify user owns the capsule via RLS-scoped authed client
    const { data: cap } = await authed
      .from('capsules')
      .select('id')
      .eq('id', capsuleId)
      .single()
    if (!cap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    try {
      const stats = await fetchCapsuleStats(capsuleId)
      return NextResponse.json(stats)
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }
  ```

- [ ] **Step 4: Verify TypeScript**

  ```bash
  cd "/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/taste"
  npx tsc --noEmit
  ```

  Expected: no errors. The `entryCount` addition to `CapsuleStats` is backward-compatible (the existing `/api/guidelines` route doesn't use `CapsuleStats`).

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/guidelines-generator.ts src/app/api/capsule/stats/route.ts
  git commit -m "feat: add entryCount to CapsuleStats and GET /api/capsule/stats route"
  ```

---

### Task 4: CapsuleWidget component

**Files:**
- Create: `src/components/home/CapsuleWidget.tsx`

- [ ] **Step 1: Create the home directory and CapsuleWidget**

  Create `src/components/home/CapsuleWidget.tsx`:

  ```tsx
  'use client'

  import type { CapsuleStats } from '@/lib/guidelines-generator'

  interface CapsuleRow {
    id: string
    version: number
    created_at: string
    rules: unknown[]
  }

  interface Props {
    capsule: CapsuleRow | null
    stats: CapsuleStats | null
    loading: boolean
  }

  interface TokenBarProps {
    name: string
    count: number
    max: number
    color: string
    soft: string
    side: 'left' | 'right'
    delay: number
  }

  function timeAgo(iso: string): string {
    const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
    if (diffH < 1) return 'just now'
    if (diffH < 24) return `${diffH}h ago`
    return `${Math.floor(diffH / 24)}d ago`
  }

  function TokenBar({ name, count, max, color, soft, side, delay }: TokenBarProps) {
    const pct = max === 0 ? 0 : Math.round((count / max) * 100)
    return (
      <div style={{
        display: 'flex',
        flexDirection: side === 'left' ? 'row' : 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
      }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          color: 'var(--ink-faint)', whiteSpace: 'nowrap',
          minWidth: 80,
          textAlign: side === 'left' ? 'right' : 'left',
        }}>
          {side === 'left' ? `← ${name} ${count}` : `${name} ${count} →`}
        </span>
        <div style={{
          flex: 1, height: 7,
          background: soft,
          overflow: 'hidden',
          borderRadius: 2,
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            transformOrigin: side === 'left' ? 'right' : 'left',
            animation: `growW 0.7s cubic-bezier(0.2,0.7,0.2,1) ${delay}ms both`,
          }} />
        </div>
      </div>
    )
  }

  export function CapsuleWidget({ capsule, stats, loading }: Props) {
    // Loading skeleton
    if (loading) {
      return (
        <div style={{
          border: '1px solid var(--line-soft)',
          borderRadius: 0,
          overflow: 'hidden',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              height: 20, margin: '10px 16px',
              background: 'var(--cream-2)',
              animation: 'pulse 1.4s ease infinite',
              animationDelay: `${i * 120}ms`,
              borderRadius: 2,
            }} />
          ))}
        </div>
      )
    }

    // No capsule
    if (!capsule) {
      return (
        <div style={{
          border: '1px solid var(--line-soft)',
          borderRadius: 0,
          padding: '20px 16px',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          color: 'var(--ink-faint)',
        }}>
          No capsule yet — generate one from any brand.
        </div>
      )
    }

    const approved = stats?.approvedTags.slice(0, 4) ?? []
    const rejected = stats?.rejectionPatterns.slice(0, 3) ?? []
    const maxApproved = approved.reduce((m, t) => Math.max(m, t.count), 1)
    const maxRejected = rejected.reduce((m, t) => Math.max(m, t.count), 1)
    const entryCount = stats?.entryCount ?? 0
    const rulesCount = Array.isArray(capsule.rules) ? capsule.rules.length : 0

    return (
      <div style={{ border: '1px solid var(--line-soft)', borderRadius: 0 }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px',
          borderBottom: '1px solid var(--line-soft)',
          background: 'var(--cream-2)',
        }}>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.08em', color: 'var(--ink)',
          }}>◇ CAPSULE</span>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)',
          }}>v{capsule.version}</span>
        </div>

        {/* Divergence grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 0,
          padding: '14px 14px 10px',
          borderBottom: '1px solid var(--line-soft)',
        }}>
          {/* Anchors (approved) */}
          <div style={{ paddingRight: 12, borderRight: '1px solid var(--line-soft)' }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em',
              color: 'var(--ink-faint)', marginBottom: 8,
            }}>ANCHORS</div>
            {approved.length === 0
              ? <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)' }}>—</div>
              : approved.map((t, i) => (
                <TokenBar
                  key={t.tag}
                  name={t.tag}
                  count={t.count}
                  max={maxApproved}
                  color="var(--green)"
                  soft="var(--green-soft, #e8f5e9)"
                  side="left"
                  delay={i * 90}
                />
              ))}
          </div>

          {/* Rejections */}
          <div style={{ paddingLeft: 12 }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em',
              color: 'var(--ink-faint)', marginBottom: 8,
            }}>REJECTION</div>
            {rejected.length === 0
              ? <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)' }}>—</div>
              : rejected.map((t, i) => (
                <TokenBar
                  key={t.tag}
                  name={t.tag}
                  count={t.count}
                  max={maxRejected}
                  color="var(--red)"
                  soft="var(--red-soft, #ffeaea)"
                  side="right"
                  delay={i * 90}
                />
              ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 4,
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
            {entryCount} entries · {rulesCount} rules · trained {timeAgo(capsule.created_at)}
          </span>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green)', display: 'inline-block',
            }} />
            MCP ready
          </span>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  cd "/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/taste"
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/home/CapsuleWidget.tsx
  git commit -m "feat: add CapsuleWidget display component"
  ```

---

### Task 5: StepRail component

**Files:**
- Create: `src/components/home/StepRail.tsx`

- [ ] **Step 1: Create StepRail**

  Create `src/components/home/StepRail.tsx`:

  ```tsx
  'use client'

  import { useRouter } from 'next/navigation'

  interface Props {
    todayCount: number
    totalCount: number
    onExport: () => void
  }

  export function StepRail({ todayCount, totalCount, onExport }: Props) {
    const router = useRouter()

    const rows = [
      {
        num: '01',
        title: 'Capture',
        sub: `${todayCount} logged today`,
        chip: <span style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.06em',
          color: 'var(--violet)', background: 'var(--violet-soft, #f0ebff)',
          padding: '2px 7px', borderRadius: 2, fontWeight: 600,
        }}>TODAY</span>,
        onClick: undefined as (() => void) | undefined,
        arrow: false,
      },
      {
        num: '02',
        title: 'Library',
        sub: `${totalCount} structured`,
        chip: <span style={{
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)', lineHeight: 1,
        }}>✓</span>,
        onClick: () => router.push('/library'),
        arrow: false,
      },
      {
        num: '03',
        title: 'Export',
        sub: 'Claude · Figma · Canva',
        chip: <span style={{
          fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1,
        }}>→</span>,
        onClick: onExport,
        arrow: true,
      },
    ]

    return (
      <div style={{ border: '1px solid var(--line-soft)', borderRadius: 0 }}>
        {rows.map((row, i) => (
          <button
            key={row.num}
            onClick={row.onClick}
            disabled={!row.onClick}
            style={{
              display: 'flex', alignItems: 'center',
              width: '100%', minHeight: 48,
              padding: '10px 14px',
              background: 'none', border: 'none',
              borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none',
              cursor: row.onClick ? 'pointer' : 'default',
              textAlign: 'left', gap: 12,
            }}
          >
            <span style={{
              fontFamily: 'var(--display)', fontSize: 12,
              color: i === 0 ? 'var(--violet)' : 'var(--ink-faint)',
              minWidth: 20, flexShrink: 0,
            }}>{row.num}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                color: 'var(--ink)', letterSpacing: '0.02em',
              }}>{row.title}</div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                color: 'var(--ink-faint)', marginTop: 1,
              }}>{row.sub}</div>
            </div>
            {row.chip}
          </button>
        ))}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  cd "/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/taste"
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/home/StepRail.tsx
  git commit -m "feat: add StepRail component for Home screen"
  ```

---

### Task 6: ExportSheet component

**Files:**
- Create: `src/components/home/ExportSheet.tsx`

- [ ] **Step 1: Create ExportSheet**

  Create `src/components/home/ExportSheet.tsx`:

  ```tsx
  'use client'

  import { useState } from 'react'
  import { Sheet } from '@/components/ui/Sheet'
  import { ExportGuidelinesSheet } from '@/components/dossier/ExportGuidelinesSheet'

  interface Props {
    open: boolean
    onClose: () => void
    capsuleId: string | null
    capsuleVersion: number | null
  }

  const ROWS = [
    { key: 'claude', label: 'Claude', connected: true },
    { key: 'figma',  label: 'Figma',  connected: false },
    { key: 'canva',  label: 'Canva',  connected: false },
  ] as const

  export function ExportSheet({ open, onClose, capsuleId, capsuleVersion }: Props) {
    const [showExport, setShowExport] = useState(false)

    if (showExport && capsuleId) {
      return (
        <ExportGuidelinesSheet
          capsuleId={capsuleId}
          filenameSlug="curato-capsule"
          onClose={() => setShowExport(false)}
        />
      )
    }

    return (
      <Sheet open={open} onClose={onClose}>
        <div style={{ padding: '20px 20px 32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span style={{
              fontFamily: 'var(--display)', fontSize: 19, fontWeight: 400,
              color: 'var(--ink)',
            }}>Export capsule</span>
            {capsuleVersion !== null && (
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)',
                background: 'var(--cream-2)', padding: '2px 6px',
                border: '1px solid var(--line-soft)',
              }}>v{capsuleVersion}</span>
            )}
          </div>
          <p style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--ink-faint)', margin: '0 0 20px',
          }}>
            Your eye, as a machine-readable file. Connected over MCP.
          </p>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {ROWS.map((row, i) => (
              <button
                key={row.key}
                onClick={row.connected && capsuleId ? () => setShowExport(true) : undefined}
                disabled={!row.connected || !capsuleId}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0',
                  background: 'none', border: 'none',
                  borderBottom: i < ROWS.length - 1 ? '1px solid var(--line-soft)' : 'none',
                  cursor: row.connected && capsuleId ? 'pointer' : 'default',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: row.connected ? 'var(--green)' : 'var(--ink-faint)',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)',
                  }}>{row.label}</span>
                </div>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10,
                  letterSpacing: '0.06em', fontWeight: 600,
                  color: row.connected ? 'var(--green)' : 'var(--violet)',
                  textDecoration: row.connected ? 'none' : 'underline',
                  textTransform: 'uppercase',
                }}>
                  {row.connected ? 'connected' : 'connect'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  cd "/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/taste"
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/home/ExportSheet.tsx
  git commit -m "feat: add ExportSheet for Home screen"
  ```

---

### Task 7: HomeScreen

**Files:**
- Replace: `src/app/(app)/feed/page.tsx`

- [ ] **Step 1: Replace feed/page.tsx with HomeScreen**

  Completely replace the contents of `src/app/(app)/feed/page.tsx` with the following:

  ```tsx
  'use client'

  import { useEffect, useState } from 'react'
  import { createClient } from '@/lib/supabase'
  import { useCaptureContext } from '@/components/capture/CaptureProvider'
  import { FocusBar } from '@/components/focus/FocusBar'
  import { CapsuleWidget } from '@/components/home/CapsuleWidget'
  import { StepRail } from '@/components/home/StepRail'
  import { ExportSheet } from '@/components/home/ExportSheet'
  import { Ic } from '@/components/icons'
  import type { CapsuleStats } from '@/lib/guidelines-generator'

  interface CapsuleRow {
    id: string
    version: number
    created_at: string
    rules: unknown[]
  }

  function headerDate(): string {
    const d = new Date()
    const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
    return `${day} · ${mon} ${d.getDate()}`
  }

  export default function HomePage() {
    const { openCapture } = useCaptureContext()
    const [capsule, setCapsule]       = useState<CapsuleRow | null>(null)
    const [stats,   setStats]         = useState<CapsuleStats | null>(null)
    const [todayCount, setTodayCount] = useState(0)
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading]       = useState(true)
    const [exportOpen, setExportOpen] = useState(false)

    useEffect(() => {
      async function load() {
        const supabase = createClient()

        // Fetch latest capsule (owned by the current user via RLS)
        const { data: cap } = await supabase
          .from('capsules')
          .select('id, version, created_at, rules')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Fetch today count + total count in parallel
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const [todayRes, totalRes] = await Promise.all([
          supabase
            .from('captures')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString()),
          supabase
            .from('captures')
            .select('*', { count: 'exact', head: true }),
        ])

        setTodayCount(todayRes.count ?? 0)
        setTotalCount(totalRes.count ?? 0)

        if (cap) {
          setCapsule(cap as CapsuleRow)
          try {
            const res = await fetch(`/api/capsule/stats?capsuleId=${cap.id}`)
            if (res.ok) setStats(await res.json() as CapsuleStats)
          } catch {
            // silent — widget shows gracefully without stats
          }
        }

        setLoading(false)
      }
      load()
    }, [])

    const trainingDays = stats?.trainingDays ?? 0

    return (
      <div style={{ background: 'var(--cream)', minHeight: '100dvh' }}>
        <FocusBar />

        <div style={{
          maxWidth: 480,
          margin: '0 auto',
          paddingBottom: 96,
          animation: 'fadeUp 0.4s ease both',
        }}>
          {/* ── Header ────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '24px 20px 8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic.mark s={18} />
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
                letterSpacing: '0.08em', color: 'var(--ink)',
              }}>CURATO</span>
            </div>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 11,
              color: 'var(--ink-faint)', letterSpacing: '0.04em',
            }}>{headerDate()}</span>
          </div>

          {/* ── Hero ──────────────────────────────────── */}
          <div style={{ padding: '16px 20px 4px' }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11,
              color: 'var(--violet)', letterSpacing: '0.06em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>
              {`Day ${trainingDays} · the eye`}
            </div>
            <h1 style={{
              fontFamily: 'var(--display)', fontSize: 31, fontWeight: 400,
              lineHeight: 1.12, letterSpacing: '-0.015em',
              color: 'var(--ink)', margin: 0,
            }}>
              Your taste is<br />
              becoming{' '}
              <em style={{ color: 'var(--violet)', fontStyle: 'italic' }}>legible.</em>
            </h1>
          </div>

          {/* ── CapsuleWidget ────────────────────────── */}
          <div style={{ padding: '20px 20px 0' }}>
            <CapsuleWidget capsule={capsule} stats={stats} loading={loading} />
          </div>

          {/* ── StepRail ─────────────────────────────── */}
          <div style={{ padding: '16px 20px 0' }}>
            <StepRail
              todayCount={todayCount}
              totalCount={totalCount}
              onExport={() => setExportOpen(true)}
            />
          </div>
        </div>

        {/* ── Fixed BottomBar ──────────────────────── */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          display: 'flex', height: 56,
          borderTop: '1px solid var(--line-soft)',
          background: 'var(--cream)',
        }}>
          <button
            onClick={openCapture}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--violet)', color: 'var(--cream)',
              fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
              letterSpacing: '0.06em',
              border: 'none', cursor: 'pointer', borderRadius: 0,
            }}
          >
            <span style={{ fontSize: 15 }}>◉</span>
            CAPTURE
          </button>
          <button
            onClick={() => setExportOpen(true)}
            style={{
              width: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--cream-2)',
              border: 'none', borderLeft: '1px solid var(--line-soft)',
              cursor: 'pointer', borderRadius: 0,
              fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--ink)',
            }}
          >
            ↑
          </button>
        </div>

        {/* ── ExportSheet ──────────────────────────── */}
        {exportOpen && (
          <ExportSheet
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            capsuleId={capsule?.id ?? null}
            capsuleVersion={capsule?.version ?? null}
          />
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  cd "/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/taste"
  npx tsc --noEmit
  ```

  Expected: no errors. `useCaptureContext` is exported from `CaptureProvider.tsx`.

- [ ] **Step 3: Verify build**

  ```bash
  cd "/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/taste"
  pnpm build
  ```

  Expected: build completes without errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/(app)/feed/page.tsx
  git commit -m "feat: replace FeedScreen with Curato HomeScreen"
  ```

---

### Task 8: Library Recents section

**Files:**
- Modify: `src/app/(app)/library/page.tsx`

- [ ] **Step 1: Add Recents helper constant and FeedCard import**

  Open `src/app/(app)/library/page.tsx`. Add the `FeedCard` import to the existing import block:

  ```ts
  // Add after the existing imports (before the EMPTY_FILTERS constant):
  import { FeedCard } from '@/components/feed/FeedCard'
  ```

  Then add a helper constant below `EMPTY_FILTERS`:

  ```ts
  function isEmptyFilters(f: LibraryFilters): boolean {
    return (
      f.query === '' &&
      f.types.length === 0 &&
      f.domains.length === 0 &&
      f.verdict === null &&
      f.contextId === null &&
      f.hasMedia === null &&
      f.dateRange === null
    )
  }
  ```

- [ ] **Step 2: Insert the Recents strip into the return JSX**

  In `src/app/(app)/library/page.tsx`, find the `return (` statement in the component. Inside the outer wrapper `<div>`, insert the Recents strip between the `SearchBar` and `FilterBar`. Look for the pattern:

  ```tsx
  <SearchBar ... />
  <FilterBar ... />
  ```

  Change it to:

  ```tsx
  <SearchBar ... />

  {/* Recents strip — shown only when no filters/search are active */}
  {!loading && captures.length > 0 && isEmptyFilters(filters) && (
    <div style={{ padding: '12px 0 4px' }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--ink-faint)',
        padding: '0 16px 8px',
      }}>Recents</div>
      <div style={{
        display: 'flex', gap: 10,
        overflowX: 'auto', paddingLeft: 16, paddingRight: 16,
        scrollbarWidth: 'none',
      }}>
        {captures.slice(0, 6).map(c => (
          <div key={c.id} style={{ flexShrink: 0, width: 160 }}>
            <FeedCard
              capture={c}
              onClick={() => setDetailCapture(c)}
              onLongPress={() => handleLongPress(c)}
            />
          </div>
        ))}
      </div>
    </div>
  )}

  <FilterBar ... />
  ```

  Keep the existing `FilterBar` props unchanged.

- [ ] **Step 3: Verify TypeScript**

  ```bash
  cd "/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/taste"
  npx tsc --noEmit
  ```

  Expected: no errors. `FeedCard` already accepts `onClick`, `capture`, and `onLongPress` props (from Phase 1/3 work).

- [ ] **Step 4: Verify build**

  ```bash
  cd "/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/taste"
  pnpm build
  ```

  Expected: build completes without errors.

- [ ] **Step 5: Commit and push**

  ```bash
  git add src/app/(app)/library/page.tsx
  git commit -m "feat: add Recents horizontal strip to Library screen"
  git push
  ```

---

## Self-review

### Spec coverage

| Spec section | Task |
|---|---|
| 1. Branding rename | Task 1 |
| 2a. New keyframes | Task 2 |
| 2b. Ic.mark | Task 2 |
| 3. GET /api/capsule/stats + entryCount | Task 3 |
| 4. HomeScreen + Hero | Task 7 |
| 5. CapsuleWidget + TokenBar | Task 4 |
| 6. StepRail | Task 5 |
| 7. ExportSheet | Task 6 |
| 8. Library Recents | Task 8 |

### Type consistency

- `CapsuleRow` is defined inline in both `CapsuleWidget.tsx` (for prop type) and `feed/page.tsx` (for state). They match exactly.
- `CapsuleStats` is imported from `@/lib/guidelines-generator` in all files — single source of truth.
- `entryCount` is added to both the `CapsuleStats` interface and the `empty` constant and final return in `fetchCapsuleStats` — no drift.
- `FeedCard` props in Library Recents (`capture`, `onClick`, `onLongPress`) match the existing FeedCard component signature from Phase 1/3.

### Gaps / edge cases addressed

- **No capsule state**: CapsuleWidget shows a friendly message, `trainingDays` defaults to 0 ("Day 0 · the eye"), StepRail still renders with counts.
- **CAPTURE button**: uses `useCaptureContext().openCapture()` — the same function the existing FAB calls. The FAB from CaptureProvider in `(app)/layout.tsx` will still render on the home screen; this is a known cosmetic overlap, acceptable for the initial implementation.
- **ExportSheet with no capsuleId**: the Claude row is disabled (`!capsuleId` guard), Figma/Canva rows are always no-op.
- **Recents strip**: only shown when `!loading && captures.length > 0 && isEmptyFilters(filters)` — never shown on an empty library or while loading.
- **`--green-soft` / `--red-soft` CSS vars**: used in CapsuleWidget with fallback values (e.g., `'var(--green-soft, #e8f5e9)'`) in case they are not defined in `globals.css`. If they are already defined, the fallback is ignored.
