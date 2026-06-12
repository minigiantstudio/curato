# Taste App

Art Director capture and taste synthesis tool. See TASTE_PHASES.md for architecture.

## Git & Deploy Rules
- **Always push to `main`** — no feature branches; every commit goes directly to `origin/main`
- Vercel is connected to `main` and auto-deploys to production on every push

## Current Phase
Phase 6 (Dossier) — COMPLETE

Phase 5 (Capsule Generation) — COMPLETE
Phase 5 components built:
- `src/types/capsule.ts` — Capsule, DistilledRule, CapsuleDiffResult types
- `src/lib/capsule.ts` — getCapsule, getCapsuleHistory, saveCapsule, diffCapsules, nextVersion, updateCapsulePublic
- `src/app/api/capsule/generate/route.ts` — POST handler: Claude call server-side + save to Supabase
- `src/app/(app)/capsule/[contextId]/page.tsx` — CapsuleScreen with generate, history, word cloud, diff
- `src/app/(app)/contexts/[id]/page.tsx` — CapsuleTab navigates to CapsuleScreen

Phase 6 (Dossier) — COMPLETE
Phase 6 components built:
- `src/components/dossier/DossierDocument.tsx` — editorial layout, paper/dark theme, print CSS
- `src/components/dossier/PublicDossierClient.tsx` — client wrapper for public route
- `src/app/(app)/dossier/[capsuleId]/page.tsx` — authenticated dossier with theme toggle, PDF export, public toggle
- `src/app/share/[id]/page.tsx` — public route with OG meta tags (capsule must be set to public)
- `src/app/(app)/capsule/[contextId]/page.tsx` — added Open Dossier button

Phase 4 (Library & Search) — COMPLETE

Phase 1 (Capture-First Flow) — COMPLETE
Phase 1 components built:
- TypeSheet, CaptureScreen, ContextStep, DoneScreen, CaptureProvider
- FAB, FeedCard, FeedScreen
- OnlineFlush (reconnect queue flushing)
- (app) route group layout with CaptureProvider
- Root redirect → /feed

Phase 4 (Library & Search) — COMPLETE
Phase 4 components built:
- `src/lib/captures.ts` — added searchCaptures, updateCapture, deleteCapture, bulkAssignContext, bulkAddTags
- `src/app/(app)/library/page.tsx` — LibraryScreen (masonry grid, infinite scroll, bulk select)
- `src/components/library/FilterBar.tsx` — filter chips (type/domain/verdict/context/date)
- `src/components/library/SearchBar.tsx` — debounced search with recent history
- `src/components/library/LibraryCard.tsx` — masonry grid cell
- `src/components/capture/CaptureDetail.tsx` — full capture detail sheet

Phase 3 (Contexts) — COMPLETE
Phase 3 components built:
- `src/types/context.ts` — Context and ContextInsert types
- `src/lib/contexts.ts` — Full data layer (CRUD, inheritance, counts)
- `src/app/(app)/contexts/page.tsx` — ContextListScreen (brands + projects)
- `src/components/contexts/CreateContextSheet.tsx` — Creation bottom sheet
- `src/app/(app)/contexts/[id]/page.tsx` — ContextScreen (Captures/Rules/Capsule tabs)
- `src/components/contexts/AssignContextSheet.tsx` — Long-press assignment sheet
- `src/components/feed/FeedCard.tsx` — Added long-press + onLongPress prop

## Core rules
- Capture is always available — FAB is persistent across all screens
- Nothing blocks a save — all fields except content are optional
- Organization happens after capture, via agent suggestions or manual assignment
- Every capture belongs to the general library; context assignment is additive, not a move

## Design system
- Tokens: always CSS variables — `var(--violet)`, `var(--cream)`, `var(--ink)`, etc.
- Fonts: ABCArizona Flare = display/editorial (`font-family: var(--display)`); DM Mono = UI/labels/data (`font-family: var(--mono)`)
- Icons: `<Ic.photo />` from `src/components/icons.tsx` only — no external icon libraries

## Capsule hierarchy
Personal → Brand → Project
Captures flow down; rules can be overridden at any level.

## Key service files (Phase 1+)
- `src/lib/captures.ts` — all capture CRUD
- `src/lib/contexts.ts` — brand/project context management
- `src/lib/capsule.ts` — capsule generation + versioning
- `src/lib/claude.ts` — all Claude API calls (model: claude-sonnet-4-6)
- `src/lib/agent.ts` — background organization agent

## Running
pnpm dev

## Database
Supabase project: [fill in project ID after connecting]
Run `pnpm db:types` to regenerate TypeScript types after schema changes.

## Component conventions
- `src/components/icons.tsx` — all SVGs, named `Ic.*`
- `src/components/ui/` — Chip, Sheet, Tag, Wave primitives
- `src/components/PhoneFrame.tsx` — iOS dev preview shell
- No external UI libraries (no shadcn, no radix, no heroicons)
