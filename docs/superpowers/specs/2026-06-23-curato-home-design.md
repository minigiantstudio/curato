# Curato Home — Design Spec

## Goal

Replace the existing Feed screen with the new Curato Home dashboard, rename the app from "Taste" to "Curato" throughout, add new design-system animations, and merge the capture feed into the Library screen.

## Source of truth

All visual and behavioural decisions are derived from the UI handoff at:
`/Users/saulsuaza/Documents/CLAUDE CODE PROJECTS/Taste App/UI/Taste-handoff/taste/project/`

Primary file: `Curato Home.html`. Secondary reference: `CAPSULE Capture.html` (animation tokens).

---

## 1. Branding rename

| File | Change |
|---|---|
| `src/app/layout.tsx` | title + description: "Taste" → "Curato" |
| `src/app/login/page.tsx` | `<h1>Taste</h1>` → `<h1>Curato</h1>` |
| `CLAUDE.md` | Project title + all references |

No database changes. No route changes.

---

## 2. Design system additions

### 2a. New keyframe animations — `src/app/globals.css`

Add alongside existing keyframes. Do not remove existing ones.

```css
@keyframes fadeUp  { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes growW   { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes tagPop  { from { transform: scale(0.78); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes slideIn { from { transform: translateX(12px); opacity: 0.75; } to { transform: translateX(0); opacity: 1; } }
@keyframes sheetUp { from { transform: translateY(105%); } to { transform: translateY(0); } }
```

### 2b. Mark icon — `src/components/icons.tsx`

Add `Ic.mark` — the Curato eye symbol (circle + inner circle, both in `--violet`).

```tsx
mark: ({ s = 20, ...p }) => (
  <div style={{ width: s, height: s, border: '1.5px solid var(--violet)', borderRadius: '50%', position: 'relative', flex: 'none', ...p }}>
    <span style={{ position: 'absolute', inset: s * 0.22, borderRadius: '50%', background: 'var(--violet)' }} />
  </div>
),
```

Note: `Ic.mark` is a `div`, not an `svg` — consistent with the design. Keep existing `Ic.*` SVG icons unchanged.

### 2c. Sharp-corner rule (new components only)

New components built in this spec use `borderRadius: 0` on primary buttons and cards. Existing components are not changed.

---

## 3. Route restructure

| Route | Before | After |
|---|---|---|
| `/feed` | FeedScreen (capture list) | **HomeScreen** (Curato Home) |
| `/library` | Library (filters + grid) | Library with **Recents section** at top |

Root redirect (`/` → `/feed`) unchanged.

---

## 4. HomeScreen

**File:** `src/app/(app)/feed/page.tsx` — replace contents entirely.

### Layout

```
HomeScreen
  scroll container
    Header row      Mark + "CURATO" wordmark + date (SAT · JUN 22 format)
    Hero block      "Day {trainingDays} · the eye" label + h1
    CapsuleWidget   divergence bars + footer meta
    StepRail        3-row loop (Capture / Library / Export)
    spacer 96px     clears the fixed bottom bar
  BottomBar (position: fixed, bottom 0)
    [  ◉  CAPTURE  ]   [ ↑ ]   ← violet 56px full-flex | 56px square
  ExportSheet overlay (conditional)
```

### Hero h1 copy

```
Your taste is
becoming legible.
```

"legible" is italic and `color: var(--violet)`. Use `font-family: var(--display)`, `font-size: 31px`, `font-weight: 400`, `line-height: 1.12`, `letter-spacing: -0.015em`.

### Date format

`new Date()` formatted as `"SAT · JUN 22"` — uppercase, `·` separator.

---

## 5. CapsuleWidget component

**File:** `src/components/home/CapsuleWidget.tsx`

### Data flow

1. Client-side `useEffect` — fetches the user's latest capsule:
   ```sql
   SELECT id, version, created_at, rules
   FROM capsules
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC
   LIMIT 1
   ```
2. Calls `fetchCapsuleStats(capsuleId)` (already in `src/lib/guidelines-generator.ts`).
3. Renders from the result.

### States

| State | Render |
|---|---|
| Loading | Skeleton: two groups of 3 placeholder bars, grey animated pulse |
| No capsule | Single bordered card: "No capsule yet — generate one from any brand." + arrow to `/contexts` |
| Error | Silent — shows empty/no-capsule state |
| Loaded | Full divergence widget (see below) |

### Loaded layout

```
┌─ header band ──────────────────────────────────────┐
│  ◇ CAPSULE                              v{version}  │
├─ divergence grid ──────────────────────────────────┤
│  ANCHORS              │         REJECTION           │
│  ←━━━━ restraint 9    │  maximalism 6 ━━━━→        │
│  ←━━━ warm light 7    │    gradients 4 ━━━→        │
│  ←━ raw material 6    │   rounded-ui 3 ━→          │
│  ←───── asymmetry 4   │                             │
├─ footer ───────────────────────────────────────────┤
│  {n} entries · {r} rules · trained {t} · ● MCP ready│
└────────────────────────────────────────────────────┘
```

- **Anchors**: `approvedTags.slice(0, 4)` — green bars, grow from right to left, `transform-origin: right`
- **Rejections**: `rejectionPatterns.slice(0, 3)` — red bars, grow left to right, `transform-origin: left`
- Bar animation: `growW 0.7s cubic-bezier(0.2,0.7,0.2,1)` with staggered `delay = index * 90ms`
- `version` from capsule row; `entries` from `approvedTags` sum + `rejectionPatterns` sum (approx); `rules` from `capsule.rules.length`; `trained` = relative time from `capsule.created_at`
- "MCP ready" always shown in green when capsule exists

### TokenBar sub-component (internal to CapsuleWidget)

```tsx
interface TokenBarProps {
  name: string
  count: number
  max: number       // max across the set, for proportional width
  color: string     // 'var(--green)' | 'var(--red)'
  soft: string      // 'var(--green-soft)' | 'var(--red-soft)'
  side: 'left' | 'right'
  delay: number     // ms
}
```

Bar track: `height: 7px`, background `soft`. Fill: `color`, animates with `growW`.

---

## 6. StepRail component

**File:** `src/components/home/StepRail.tsx`

Three rows, each `minHeight: 48px`, separated by `1px solid var(--line-soft)`:

| # | Title | Sub-label | State chip | Action |
|---|---|---|---|---|
| 01 | Capture | "{todayCount} logged today" | "today" in violet | no-op (FAB handles it) |
| 02 | Library | "{totalCount} structured" | ✓ green check | `router.push('/library')` |
| 03 | Export | "Claude · Figma · Canva" | → arrow | opens ExportSheet |

- `todayCount`: captures created today (`created_at >= today 00:00 UTC`) from Supabase
- `totalCount`: `COUNT(*)` from captures for this user
- Both fetched in a single `useEffect` alongside the capsule fetch
- Number `01` uses `font-family: var(--display)`, violet if active, `--ink-faint` otherwise

---

## 7. ExportSheet component

**File:** `src/components/home/ExportSheet.tsx`

Bottom sheet (same pattern as existing sheets in the app). Three rows:

| Target | Status | Behaviour |
|---|---|---|
| Claude | connected | tapping opens the existing ExportGuidelinesSheet flow |
| Figma | connect | tapping is a no-op (visual only, future) |
| Canva | connect | tapping is a no-op (visual only, future) |

The diamond icon (`Ic.diamond`) is green for "connected", `--ink-faint` for "connect".
"connected" label: green uppercase mono. "connect" label: violet, underlined, uppercase mono.

Sheet header: "Export capsule" (display font, 19px) + version badge.
Sub-copy: "Your eye, as a machine-readable file. Connected over MCP."

---

## 8. Library screen — Recents section

**File:** `src/app/(app)/library/page.tsx`

Add a **Recents strip** at the very top of the Library screen, above the FilterBar:

```
RECENTS label (10px mono uppercase)
  [FeedCard] [FeedCard] [FeedCard]  ← horizontal scroll, reuses existing FeedCard
  "View all" link → scrolls to main grid
```

- Shows the 6 most recent captures (order by `created_at desc`, limit 6)
- Reuses existing `FeedCard` component
- Only shown when FilterBar is in default state (no active filters, no search query)
- Hides when user applies filters (seamless — the full grid is the source of truth)

---

## 9. Out of scope for this spec

- Landing page (`Curato Landing.html`) — planned for a later phase
- Capture screen redesign (`CAPSULE Capture.html`)
- Onboarding flow (`CAPSULE Onboarding.html`)
- Dossier redesign (`Capsule Dossier.html`)
- Functional Figma / Canva MCP connections

---

## Architecture notes

- All new components live in `src/components/home/` (new directory)
- `CapsuleWidget` is a client component — uses Supabase browser client + `fetchCapsuleStats`
- `fetchCapsuleStats` is imported from `@/lib/guidelines-generator` — server-only module. Since `CapsuleWidget` is a client component, it must call this via an API route, NOT import it directly.
  - Option: expose a new `GET /api/capsule/stats?capsuleId=` route that calls `fetchCapsuleStats` server-side
  - `CapsuleWidget` fetches from this route
- `StepRail` counts come from the same client-side Supabase query (browser client, RLS-scoped)
- No new DB migrations required
