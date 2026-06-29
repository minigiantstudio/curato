# Inbox Demotion — MVP Nav Refocus Design

**Goal:** Remove Inbox from the primary nav and reframe the Home StepRail around the MVP loop (capture → capsule → export), keeping the Inbox route alive but deprioritised.

**Context:** The Inbox triage queue is a native-app-grade feature that adds friction to the web MVP. The MVP's core goal is: create rules, capture images, and feed a Design System via capsules. The current 4-tab nav (Home / Inbox / Capsule / Brands) leads users into a triage flow instead of the capture → capsule loop.

**Architecture:** Three targeted file edits, no new files, no data model changes.

---

## Changes

### 1. Bottom Nav — `src/app/(app)/layout.tsx`

Remove the `{ href: '/inbox', label: 'Inbox' }` entry from the `tabs` array.

Result: **Home / Capsule / Brands** (3 tabs).

The existing `isInbox` guard in `AppShell` stays — the Inbox route still hides nav and FAB when accessed directly (via the StepRail or any deep link).

### 2. StepRail — `src/components/home/StepRail.tsx`

Reorder and relabel the 4 rows to reflect the MVP loop:

| # | Label | Subtitle | Chip | Action |
|---|-------|----------|------|--------|
| 01 | Captures | `{totalCount} in library` · `{todayCount} today` | count or ✓ | → `/library` |
| 02 | Capsule | `v{version} — latest` / `not generated yet` | → or — | → `/capsule/{contextId}` |
| 03 | Export | `Claude · Figma · Canva` | ↑ | opens export sheet |
| 04 | Review | `{inboxCount} to review` / `you're caught up` | count badge or ✓ | → `/inbox` |

No new props needed — `todayCount`, `totalCount`, `inboxCount`, `capsuleContextId`, `capsuleVersion`, and `onExport` are already passed from the Home page. Only the row definitions inside the component change.

### 3. DoneScreen copy — `src/components/capture/DoneScreen.tsx`

Change `"Back to feed"` → `"Back to Home"` to match the nav tab label.

---

## What Does NOT Change

- `/inbox` route and all its triage logic — kept intact, accessible via StepRail row 04
- Capture flow, ContextStep, verdict system — untouched
- `isInbox` layout guard — stays (Inbox still runs full-screen when visited)
- Brand Focus Mode, Capsule, Dossier, DS sync — all unaffected

---

## Files Touched

| File | Change |
|------|--------|
| `src/app/(app)/layout.tsx` | Remove Inbox tab from `tabs` array |
| `src/components/home/StepRail.tsx` | Reorder rows: Captures / Capsule / Export / Review |
| `src/components/capture/DoneScreen.tsx` | `"Back to feed"` → `"Back to Home"` |
