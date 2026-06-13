# Brand Focus Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a session-only Brand Focus Mode that pins one brand and routes every capture through a streamlined context screen that auto-attaches to it.

**Architecture:** A new `FocusProvider` React context (state mirrored to `sessionStorage`) wraps the authenticated app outside `CaptureProvider`. A minimal `FocusBar` shows on the Feed when focused. Brand cards gain a focus affordance. When focus is active, `CaptureProvider` renders `FocusContextStep` instead of the normal `ContextStep` and, on save, writes the capture with `context_ids: [brand.id]` plus an optional second linked `rule` capture.

**Tech Stack:** Next.js 14 (App Router, client components), React 18, TypeScript, inline-style design tokens (CSS variables). Supabase for persistence (existing `saveCapture` / `saveCaptureWithMedia`).

**Spec:** `docs/superpowers/specs/2026-06-13-brand-focus-mode-design.md`

---

## Testing approach

This project has **no unit-test framework** (no vitest/jest, no `*.test.*` files). Every prior phase verified via TypeScript typecheck + Next build + manual preview. This plan follows that same pattern. Each task's verification step is:

- `npx tsc --noEmit` → expect no errors
- where UI behavior changes, a manual preview check via the preview tools (`pnpm dev` is already wired; use `preview_start` / `preview_snapshot`).

Do **not** add a test framework — it is out of scope and out of pattern.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/focus/FocusProvider.tsx` | Context holding `focusedBrand`, `enterFocus`, `exitFocus`; sessionStorage mirror |
| `src/components/focus/FocusBar.tsx` | Minimal violet bar (brand name + exit) shown on Feed |
| `src/components/focus/index.ts` | Barrel re-export for the two above |
| `src/components/icons.tsx` | Add a `focus` (target) icon |
| `src/components/capture/FocusContextStep.tsx` | Streamlined single-screen context step for focus mode |
| `src/app/(app)/layout.tsx` | Wrap children with `FocusProvider` (outside `CaptureProvider`) |
| `src/app/(app)/feed/page.tsx` | Render `FocusBar` at top when focused |
| `src/app/(app)/contexts/page.tsx` | Focus affordance on brand cards → enter focus, route to `/feed` |
| `src/components/capture/CaptureProvider.tsx` | Render `FocusContextStep` when focused; dual-row save |

---

## Task 1: Focus icon + FocusProvider

**Files:**
- Modify: `src/components/icons.tsx` (add `focus` icon to the `Ic` object)
- Create: `src/components/focus/FocusProvider.tsx`
- Create: `src/components/focus/index.ts`

- [ ] **Step 1: Add a `focus` target icon**

In `src/components/icons.tsx`, add this entry to the `Ic` object (place it after the `tag` icon, before `chevron`):

```tsx
  focus: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
    </svg>
  ),
```

- [ ] **Step 2: Create the FocusProvider**

Create `src/components/focus/FocusProvider.tsx`:

```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Context } from '@/types/context'

const STORAGE_KEY = 'taste.focusedBrand'

interface FocusContextValue {
  focusedBrand: Context | null
  enterFocus: (brand: Context) => void
  exitFocus: () => void
}

const FocusContext = createContext<FocusContextValue>({
  focusedBrand: null,
  enterFocus: () => {},
  exitFocus: () => {},
})

export function useFocus() {
  return useContext(FocusContext)
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [focusedBrand, setFocusedBrand] = useState<Context | null>(null)

  // Rehydrate from sessionStorage on mount (survives navigation, clears on tab close)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) setFocusedBrand(JSON.parse(raw) as Context)
    } catch {
      /* ignore malformed storage */
    }
  }, [])

  const enterFocus = useCallback((brand: Context) => {
    setFocusedBrand(brand)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(brand))
    } catch {
      /* ignore quota / private mode */
    }
  }, [])

  const exitFocus = useCallback(() => {
    setFocusedBrand(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <FocusContext.Provider value={{ focusedBrand, enterFocus, exitFocus }}>
      {children}
    </FocusContext.Provider>
  )
}
```

- [ ] **Step 3: Create the barrel export**

Create `src/components/focus/index.ts`:

```ts
export { FocusProvider, useFocus } from './FocusProvider'
export { FocusBar } from './FocusBar'
```

> Note: `FocusBar` does not exist yet (Task 2). The barrel will not be imported until Task 3, so this is safe; if running `tsc` now, temporarily comment the FocusBar line, or do Step 3 after Task 2. Simplest: create the barrel here but expect the FocusBar line to error until Task 2 — do not run the typecheck for this task until Task 2 is also done.

- [ ] **Step 4: Verify typecheck (icon + provider only)**

Temporarily ensure the barrel's FocusBar line is commented out, then run:

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "Taste App/taste"
git add src/components/icons.tsx src/components/focus/FocusProvider.tsx src/components/focus/index.ts
git commit -m "feat(focus): FocusProvider context + focus icon"
```

---

## Task 2: FocusBar component

**Files:**
- Create: `src/components/focus/FocusBar.tsx`

- [ ] **Step 1: Create the FocusBar**

Create `src/components/focus/FocusBar.tsx`. Minimal violet bar matching the approved mockup (brand name + exit, no count):

```tsx
'use client'

import { useFocus } from './FocusProvider'

export function FocusBar() {
  const { focusedBrand, exitFocus } = useFocus()
  if (!focusedBrand) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '10px 16px 0',
        padding: '11px 14px',
        background: 'var(--violet)',
        borderRadius: 12,
        color: '#fff',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#9ef0c4',
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>
          Focused
        </span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{focusedBrand.name}</span>
      </div>
      <button
        onClick={exitFocus}
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: '#fff',
          opacity: 0.85,
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 20,
          padding: '4px 11px',
          background: 'none',
          cursor: 'pointer',
        }}
      >
        Exit ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Uncomment the barrel's FocusBar export**

Ensure `src/components/focus/index.ts` has the (now valid) line:

```ts
export { FocusBar } from './FocusBar'
```

- [ ] **Step 3: Verify typecheck**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "Taste App/taste"
git add src/components/focus/FocusBar.tsx src/components/focus/index.ts
git commit -m "feat(focus): minimal FocusBar component"
```

---

## Task 3: Wire FocusProvider in layout + FocusBar in Feed

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(app)/feed/page.tsx`

- [ ] **Step 1: Wrap the app with FocusProvider**

In `src/app/(app)/layout.tsx`, add the import at the top with the other imports:

```tsx
import { FocusProvider } from '@/components/focus'
```

Then change the `AppLayout` return so `FocusProvider` wraps `CaptureProvider`:

```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FocusProvider>
      <CaptureProvider>
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden', paddingBottom: '52px' }}>
          {children}
          <FAB />
          <SyncIndicator />
          <BottomNav />
        </div>
      </CaptureProvider>
    </FocusProvider>
  )
}
```

- [ ] **Step 2: Render FocusBar at the top of the Feed**

In `src/app/(app)/feed/page.tsx`, add the import alongside the other component imports:

```tsx
import { FocusBar } from '@/components/focus'
```

Then, inside the returned JSX, place `<FocusBar />` as the first child of the root `screen-in` div — immediately before the `{/* Header */}` block:

```tsx
  return (
    <div className="screen-in" style={{ height: '100%', overflowY: 'auto', background: 'var(--cream)' }}>
      <FocusBar />
      {/* Header */}
      <div
        style={{
          padding: '16px 20px 12px',
```

(Leave the rest of the file unchanged.)

- [ ] **Step 3: Verify typecheck**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "Taste App/taste"
git add "src/app/(app)/layout.tsx" "src/app/(app)/feed/page.tsx"
git commit -m "feat(focus): wire FocusProvider into layout and FocusBar into Feed"
```

---

## Task 4: Brand-card focus affordance

**Files:**
- Modify: `src/app/(app)/contexts/page.tsx`

- [ ] **Step 1: Import the focus hook and icon**

At the top of `src/app/(app)/contexts/page.tsx`, add to the imports:

```tsx
import { Ic } from '@/components/icons'
import { useFocus } from '@/components/focus'
```

- [ ] **Step 2: Add an `onFocus` prop to ContextCard**

Update the `ContextCardProps` interface (currently `context`, `captureCount`, `parentName`, `onClick`) to add an optional `onFocus`:

```tsx
interface ContextCardProps {
  context: Context
  captureCount: number
  parentName: string | null
  onClick: () => void
  onFocus?: () => void
}
```

Update the `ContextCard` signature:

```tsx
function ContextCard({ context, captureCount, parentName, onClick, onFocus }: ContextCardProps) {
```

- [ ] **Step 3: Render the focus button in the card's top row (brands only)**

In `ContextCard`, the top row currently renders the name and the type badge. Replace that top row's closing so the type badge is grouped with a focus button. Find this block:

```tsx
        <span style={{
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: context.type === 'brand' ? 'var(--violet)' : 'var(--ink-faint)',
          background: context.type === 'brand' ? 'rgba(74,61,176,0.07)' : 'var(--panel)',
          padding: '2px 7px',
          borderRadius: 4,
          border: `1px solid ${context.type === 'brand' ? 'var(--violet)' : 'var(--line-soft)'}`,
        }}>
          {context.type}
        </span>
      </div>
```

Replace it with (wraps badge + optional focus button in a flex group):

```tsx
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 9,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: context.type === 'brand' ? 'var(--violet)' : 'var(--ink-faint)',
            background: context.type === 'brand' ? 'rgba(74,61,176,0.07)' : 'var(--panel)',
            padding: '2px 7px',
            borderRadius: 4,
            border: `1px solid ${context.type === 'brand' ? 'var(--violet)' : 'var(--line-soft)'}`,
          }}>
            {context.type}
          </span>
          {onFocus && (
            <button
              aria-label={`Focus on ${context.name}`}
              onClick={e => { e.stopPropagation(); onFocus() }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid var(--violet)',
                background: 'rgba(74,61,176,0.07)',
                color: 'var(--violet)',
                cursor: 'pointer',
              }}
            >
              <Ic.focus width={16} height={16} />
            </button>
          )}
        </div>
      </div>
```

- [ ] **Step 4: Wire enterFocus + route on the brand list**

In the `ContextsPage` component body, get the hook (near the existing `const router = useRouter()`):

```tsx
  const { enterFocus } = useFocus()
```

Then in the brands `.map(...)` that renders `ContextCard`, add the `onFocus` prop. Find:

```tsx
              {brands.map(ctx => (
                <ContextCard
                  key={ctx.id}
                  context={ctx}
                  captureCount={counts[ctx.id] ?? 0}
                  parentName={null}
                  onClick={() => router.push(`/contexts/${ctx.id}`)}
                />
              ))}
```

Replace with:

```tsx
              {brands.map(ctx => (
                <ContextCard
                  key={ctx.id}
                  context={ctx}
                  captureCount={counts[ctx.id] ?? 0}
                  parentName={null}
                  onClick={() => router.push(`/contexts/${ctx.id}`)}
                  onFocus={() => { enterFocus(ctx); router.push('/feed') }}
                />
              ))}
```

(The projects `.map` is left unchanged — no `onFocus`, so no focus button shows for projects.)

- [ ] **Step 5: Verify typecheck**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual preview check**

Start preview, open `/contexts`, confirm each **brand** card shows a violet target button and project cards do not. Tap a brand's target → lands on `/feed` with the violet FocusBar showing that brand's name. Tap "Exit ✕" → bar disappears.

- [ ] **Step 7: Commit**

```bash
cd "Taste App/taste"
git add "src/app/(app)/contexts/page.tsx"
git commit -m "feat(focus): brand-card focus affordance enters focus and routes to feed"
```

---

## Task 5: FocusContextStep component

**Files:**
- Create: `src/components/capture/FocusContextStep.tsx`

This is the streamlined single screen approved in the mockup. It reuses `DOMAINS`, `RULE_VERBS`, `Verdict`, `RuleVerb`, `CaptureType` from `@/types/capture` and the `Chip` primitive.

- [ ] **Step 1: Create the component**

Create `src/components/capture/FocusContextStep.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Ic } from '@/components/icons'
import { Chip } from '@/components/ui/Chip'
import { DOMAINS, RULE_VERBS, type CaptureType, type Verdict, type RuleVerb } from '@/types/capture'
import type { Context } from '@/types/context'

export interface FocusContextData {
  verdict: Exclude<Verdict, null>
  domain: string | null
  take: string
  rule: { verb: RuleVerb; text: string } | null
}

interface FocusContextStepProps {
  brand: Context
  type: CaptureType
  content: string
  onBack: () => void
  onDone: (data: FocusContextData) => void
}

export function FocusContextStep({ brand, content, onBack, onDone }: FocusContextStepProps) {
  const [verdict, setVerdict] = useState<Exclude<Verdict, null> | null>(null)
  const [domain, setDomain] = useState<string>('')
  const [take, setTake] = useState(content)
  const [ruleOpen, setRuleOpen] = useState(false)
  const [ruleVerb, setRuleVerb] = useState<RuleVerb>('ALWAYS')
  const [ruleText, setRuleText] = useState('')

  const canSave = verdict !== null

  function handleSave() {
    if (verdict === null) return
    const rule = ruleOpen && ruleText.trim()
      ? { verb: ruleVerb, text: ruleText.trim() }
      : null
    onDone({ verdict, domain: domain || null, take, rule })
  }

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cream)', overflow: 'hidden' }}>
      {/* Header with pre-filled brand chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line-soft)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', padding: 4 }}>
          <Ic.back width={20} height={20} />
        </button>
        <span className="label">Context</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--violet)', color: '#fff', borderRadius: 20, padding: '4px 11px', fontSize: 11, fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ef0c4' }} />
          {brand.name}
        </span>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Verdict */}
        <div style={{ padding: '14px 16px 6px' }}>
          <div className="label" style={{ marginBottom: 8 }}>Is this {brand.name}?</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setVerdict('keep')}
              style={{
                flex: 1, borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                border: '2px solid var(--green, #3f9d6b)',
                background: verdict === 'keep' ? 'var(--green, #3f9d6b)' : 'rgba(63,157,107,0.10)',
                color: verdict === 'keep' ? '#fff' : 'var(--green, #2f7d52)',
              }}
            >
              ◎ Good example
            </button>
            <button
              onClick={() => setVerdict('reject')}
              style={{
                flex: 1, borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                border: '2px solid var(--red, #c25b54)',
                background: verdict === 'reject' ? 'var(--red, #c25b54)' : 'rgba(194,91,84,0.10)',
                color: verdict === 'reject' ? '#fff' : 'var(--red, #a33)',
              }}
            >
              ✕ Not it
            </button>
          </div>
        </div>

        {/* Inline optional rule */}
        <div style={{ padding: '6px 16px 0' }}>
          {!ruleOpen ? (
            <button
              onClick={() => setRuleOpen(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                border: '1.5px dashed var(--line)', borderRadius: 12, padding: '12px 14px',
                background: 'none', color: 'var(--ink-soft)', fontSize: 13, cursor: 'pointer',
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--panel)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>+</span>
              Turn this into a rule (optional)
            </button>
          ) : (
            <div style={{ border: '1.5px solid var(--line-soft)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="label">Rule</span>
                <button onClick={() => { setRuleOpen(false); setRuleText('') }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 12 }}>Remove</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RULE_VERBS.map(v => (
                  <Chip key={v} label={v} variant={ruleVerb === v ? 'on' : 'off'} onClick={() => setRuleVerb(v)} />
                ))}
              </div>
              <textarea
                value={ruleText}
                onChange={e => setRuleText(e.target.value)}
                rows={2}
                placeholder="state the rule clearly…"
                style={{ resize: 'none', background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, padding: '10px 12px', lineHeight: 1.5 }}
              />
            </div>
          )}
        </div>

        {/* Domain */}
        <div style={{ padding: '14px 16px 6px' }}>
          <div className="label" style={{ marginBottom: 8 }}>Domain</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DOMAINS.map(d => (
              <Chip key={d} label={d} variant={domain === d ? 'on' : 'off'} onClick={() => setDomain(domain === d ? '' : d)} />
            ))}
          </div>
        </div>

        {/* Your take */}
        <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="label" style={{ marginBottom: 8 }}>Your take</div>
          <textarea
            value={take}
            onChange={e => setTake(e.target.value)}
            rows={3}
            placeholder="What does it feel like, exactly?"
            style={{ resize: 'none', background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, padding: '11px 13px', lineHeight: 1.55 }}
          />
        </div>
      </div>

      {/* Save */}
      <div style={{ padding: '10px 16px 14px', flexShrink: 0 }}>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            width: '100%', padding: '15px', borderRadius: 12,
            background: canSave ? 'var(--violet)' : 'var(--panel)',
            color: canSave ? '#fff' : 'var(--ink-faint)',
            fontSize: 13, letterSpacing: '0.04em',
            cursor: canSave ? 'pointer' : 'default',
            border: 'none',
            transition: 'background .2s, color .2s',
          }}
        >
          Save to {brand.name} →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors. (Component is not yet rendered anywhere — that happens in Task 6.)

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add src/components/capture/FocusContextStep.tsx
git commit -m "feat(focus): streamlined FocusContextStep capture screen"
```

---

## Task 6: CaptureProvider focus branch + dual-row save

**Files:**
- Modify: `src/components/capture/CaptureProvider.tsx`

The current `CaptureProvider` renders `ContextStep` for the `'context'` step and persists via `persistAndDone`. When a brand is focused, it must instead render `FocusContextStep` and persist via a new dual-row path.

- [ ] **Step 1: Add imports**

In `src/components/capture/CaptureProvider.tsx`, add to the imports near the other component/lib imports:

```tsx
import { FocusContextStep, type FocusContextData } from './FocusContextStep'
import { useFocus } from '@/components/focus'
import type { Context } from '@/types/context'
```

- [ ] **Step 2: Read focus state in the provider**

Inside `CaptureProvider`, near `const router = useRouter()`, add:

```tsx
  const { focusedBrand } = useFocus()
```

- [ ] **Step 3: Add the focus persist handler**

Add this function inside `CaptureProvider`, right after the existing `persistAndDone` function:

```tsx
  // ── Focus mode: persist capture + optional linked rule ───────
  async function persistFocusAndDone(data: FocusContextData, brand: Context) {
    const { type, mediaFile } = flowData.current

    let session = null
    try { session = await getOrCreateAnonSession() } catch { /* offline */ }
    await flushOfflineQueue()

    // Primary capture row — tagged to the focused brand
    const primary: CaptureInsert = {
      type: type!,
      content: data.take,
      verdict: data.verdict,
      domains: data.domain ? [data.domain] : undefined,
      context_ids: [brand.id],
    }
    const saved = mediaFile
      ? await saveCaptureWithMedia(primary, mediaFile, 'photos')
      : await saveCapture(primary)

    // Optional second linked rule row
    if (data.rule) {
      const ruleInsert: CaptureInsert = {
        type: 'rule',
        content: data.rule.text,
        rule_verb: data.rule.verb,
        domains: data.domain ? [data.domain] : undefined,
        context_ids: [brand.id],
      }
      await saveCapture(ruleInsert)
    }

    if (saved && session?.user?.id) {
      void triggerAgent(saved.id, session.user.id)
    }
    setSavedEntry({
      type: type!,
      content: data.take,
      verdict: data.verdict,
      domain: data.domain ?? '',
      tags: [],
    })
    setStep('done')
  }
```

- [ ] **Step 4: Render FocusContextStep when focused**

In the render, find the existing `'context'` step block:

```tsx
          {step === 'context' && (
            <ContextStep
              type={type}
              content={flowData.current.content ?? ''}
              onBack={() => setStep('capture')}
              onDone={ctx => { void onContextDone(ctx) }}
            />
          )}
```

Replace it with a focus-aware branch:

```tsx
          {step === 'context' && focusedBrand && (
            <FocusContextStep
              brand={focusedBrand}
              type={type}
              content={flowData.current.content ?? ''}
              onBack={() => setStep('capture')}
              onDone={data => { void persistFocusAndDone(data, focusedBrand) }}
            />
          )}
          {step === 'context' && !focusedBrand && (
            <ContextStep
              type={type}
              content={flowData.current.content ?? ''}
              onBack={() => setStep('capture')}
              onDone={ctx => { void onContextDone(ctx) }}
            />
          )}
```

- [ ] **Step 5: Verify typecheck**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual preview check**

With a brand focused (FocusBar visible), tap the FAB → pick Photo → take/skip a photo → the **FocusContextStep** appears (brand chip in header, "Is this {brand}?" verdict). Pick "Good example", optionally open and fill a rule, hit "Save to {brand} →". Confirm it lands on the Done screen. Then verify in the Feed that the new capture appears (and, if a rule was added, a separate rule entry). With focus exited, the normal `ContextStep` must still appear for a capture.

- [ ] **Step 7: Commit**

```bash
cd "Taste App/taste"
git add src/components/capture/CaptureProvider.tsx
git commit -m "feat(focus): render FocusContextStep and dual-row save when focused"
```

---

## Task 7: Final verification + docs

**Files:**
- Modify: `Taste App/taste/CLAUDE.md`

- [ ] **Step 1: Full typecheck + build**

Run: `cd "Taste App/taste" && npx tsc --noEmit && npx next build`
Expected: typecheck clean; build completes with no errors.

- [ ] **Step 2: Document the feature in CLAUDE.md**

In `Taste App/taste/CLAUDE.md`, add this block after the existing Phase notes (near the top, after the Phase 6 section):

```markdown
Brand Focus Mode — COMPLETE
Focus components built:
- `src/components/focus/FocusProvider.tsx` — session-only focusedBrand context (sessionStorage)
- `src/components/focus/FocusBar.tsx` — minimal violet bar on Feed (brand name + exit)
- `src/components/capture/FocusContextStep.tsx` — streamlined capture context screen
- Brand cards (`contexts/page.tsx`) gain a focus affordance → enter focus, route to /feed
- `CaptureProvider` renders FocusContextStep when focused; dual-row save (capture + optional linked rule), both tagged to the brand via context_ids
- Session-only: clears on tab/app close. No DB migration.
```

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add CLAUDE.md
git commit -m "docs: record Brand Focus Mode in CLAUDE.md"
```

---

## Self-Review notes

- **Spec coverage:** FocusProvider/sessionStorage (T1), FocusBar (T2), layout+feed wiring (T3), brand-card entry affordance (T4), FocusContextStep with verdict/inline rule/domain/take (T5), focus-aware render + dual-row save with `context_ids:[brand.id]` (T6), scope-respecting docs + build (T7). All spec sections map to a task.
- **Type consistency:** `FocusContextData` defined in T5 is imported and consumed unchanged in T6. `Verdict` values `'keep'`/`'reject'` match the type. `enterFocus`/`exitFocus`/`focusedBrand` names consistent across T1, T3, T4, T6.
- **Out of scope confirmed:** no count badge, no quick-switcher, no localStorage, no Library/Capsule focus, no DB columns.
