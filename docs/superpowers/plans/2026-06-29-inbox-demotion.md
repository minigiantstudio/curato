# Inbox Demotion — MVP Nav Refocus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Inbox from the primary bottom nav (3 tabs: Home / Capsule / Brands), reorder the Home StepRail to lead with Captures → Capsule → Export → Review, and update the DoneScreen copy.

**Architecture:** Three isolated file edits — BottomNav tabs array, StepRail rows array, DoneScreen button label. No new files, no schema changes, no prop interface changes.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, inline styles (no Tailwind/CSS modules).

---

## Files

| File | Change |
|------|--------|
| `src/app/(app)/layout.tsx` | Remove `{ href: '/inbox', label: 'Inbox' }` from `tabs` |
| `src/components/home/StepRail.tsx` | Replace `rows` array: Captures / Capsule / Export / Review |
| `src/components/capture/DoneScreen.tsx` | `"Back to feed"` → `"Back to Home"` |

---

## Task 1: Remove Inbox from BottomNav

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Edit the tabs array**

In `src/app/(app)/layout.tsx`, find the `tabs` array inside `BottomNav` (around line 13) and remove the Inbox entry:

```typescript
const tabs = [
  { href: '/feed',     label: 'Home'    },
  { href: '/capsule',  label: 'Capsule' },
  { href: '/contexts', label: 'Brands'  },
]
```

- [ ] **Step 2: Type-check**

```bash
cd "Taste App/taste" && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/layout.tsx"
git commit -m "feat(nav): remove Inbox tab — 3-tab nav Home / Capsule / Brands"
```

---

## Task 2: Reorder StepRail rows

**Files:**
- Modify: `src/components/home/StepRail.tsx`

The current props interface (`todayCount`, `totalCount`, `inboxCount`, `capsuleContextId`, `capsuleVersion`, `onExport`) stays unchanged — only the `rows` array inside the component changes.

- [ ] **Step 1: Replace the rows array**

In `src/components/home/StepRail.tsx`, replace the entire `rows` array (lines 17–68) with:

```typescript
  const rows = [
    {
      num: '01',
      title: 'Captures',
      sub: `${totalCount} in library`,
      chip: todayCount > 0
        ? <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.06em',
            color: '#fff', background: 'var(--violet)',
            padding: '2px 7px', borderRadius: 2, fontWeight: 700,
          }}>{todayCount}</span>
        : <span style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)', lineHeight: 1,
          }}>✓</span>,
      onClick: () => router.push('/library'),
      accent: false,
    },
    {
      num: '02',
      title: 'Capsule',
      sub: capsuleVersion != null ? `v${capsuleVersion} — latest` : 'not generated yet',
      chip: capsuleContextId
        ? <span style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--violet)', lineHeight: 1,
          }}>→</span>
        : <span style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', lineHeight: 1,
          }}>—</span>,
      onClick: capsuleContextId ? () => router.push(`/capsule/${capsuleContextId}`) : undefined,
      accent: false,
    },
    {
      num: '03',
      title: 'Export',
      sub: 'Claude · Figma · Canva',
      chip: <span style={{
        fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1,
      }}>↑</span>,
      onClick: onExport,
      accent: false,
    },
    {
      num: '04',
      title: 'Review',
      sub: inboxCount > 0 ? `${inboxCount} to review` : "you're caught up",
      chip: inboxCount > 0
        ? <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.06em',
            color: '#fff', background: 'var(--violet)',
            padding: '2px 7px', borderRadius: 2, fontWeight: 700,
          }}>{inboxCount}</span>
        : <span style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)', lineHeight: 1,
          }}>✓</span>,
      onClick: () => router.push('/inbox'),
      accent: inboxCount > 0,
    },
  ]
```

The `todayLine` block (below the rows array) and the JSX render loop are unchanged — `todayLine` still renders on row index 0, which is now "Captures". This shows "N logged today" as a secondary line under the captures count, which is correct.

- [ ] **Step 2: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/components/home/StepRail.tsx"
git commit -m "feat(home): reorder StepRail — Captures / Capsule / Export / Review"
```

---

## Task 3: Update DoneScreen copy

**Files:**
- Modify: `src/components/capture/DoneScreen.tsx`

- [ ] **Step 1: Change the button label**

In `src/components/capture/DoneScreen.tsx`, find the "Back to feed" button (around line 118) and change the label:

```typescript
          Back to Home
```

The full button block after the change:

```typescript
        <button
          onClick={onFeed}
          style={{
            width: '100%', padding: '10px',
            background: 'none', border: 'none',
            color: 'var(--ink-faint)', fontSize: 11,
            letterSpacing: '0.04em', cursor: 'pointer',
            fontFamily: 'var(--mono)',
          }}
        >
          Back to Home
        </button>
```

- [ ] **Step 2: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit and push**

```bash
git add "src/components/capture/DoneScreen.tsx"
git commit -m "fix(done-screen): 'Back to feed' → 'Back to Home' to match nav label"
git push origin main
```

---

## Visual Verification (after all tasks)

Run `pnpm dev` and check:

1. **Bottom nav** — 3 tabs only: Home, Capsule, Brands. No Inbox tab.
2. **Home StepRail** — rows read: 01 Captures / 02 Capsule / 03 Export / 04 Review. Row 04 Review shows inbox count badge if pending items exist.
3. **StepRail row 04** — tapping Review navigates to `/inbox` (full-screen, no nav).
4. **Done screen** — after capturing, bottom ghost button reads "Back to Home" not "Back to feed".
