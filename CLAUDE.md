# Curato

Visual intelligence capture and synthesis tool. See TASTE_PHASES.md for architecture.

## Git & Deploy Rules
- **Always push to `main`** — no feature branches; every commit goes directly to `origin/main`
- Vercel is connected to `main` and auto-deploys to production on every push

## Current Phase
Curato Home — COMPLETE

Renamed app from "Taste" to "Curato". Replaced FeedScreen with Curato HomeScreen dashboard.
New files:
- `src/components/home/CapsuleWidget.tsx` — divergence bar widget (anchors/rejections)
- `src/components/home/StepRail.tsx` — 3-row loop (Capture / Library / Export)
- `src/components/home/ExportSheet.tsx` — export sheet with Claude/Figma/Canva rows
- `src/app/api/capsule/stats/route.ts` — GET /api/capsule/stats?capsuleId=
Modified:
- `src/app/(app)/feed/page.tsx` — replaced with new HomeScreen
- `src/app/(app)/library/page.tsx` — added Recents horizontal strip above FilterBar
- `src/lib/guidelines-generator.ts` — CapsuleStats.entryCount added
- `src/app/globals.css` — fadeUp, growW, shimmer keyframes added
- `src/components/icons.tsx` — Ic.mark (div-based circle icon) added

Phase 6 (Dossier) — COMPLETE

Magic-Link Auth — COMPLETE
Hard-gated email magic-link sign-in (anonymous auth removed).
- `src/middleware.ts` — refreshes the Supabase session cookie every request + redirects unauthenticated app-route requests to /login (fixes data disappearing on refresh). MUST live in src/ (not repo root) for Next to register it with this src/-based app.
- `src/app/login/page.tsx` — request a magic link (signInWithOtp); reads ?error via window.location (no useSearchParams → no Suspense requirement)
- `src/app/auth/callback/route.ts` — exchangeCodeForSession → /feed
- `src/lib/supabase.ts` / `src/lib/auth.ts` — session helpers return current user/session; no signInAnonymously
- `src/app/(app)/contexts/page.tsx` — signed-in email + Sign out
- `src/app/api/capsule/generate/route.ts` + `src/app/api/transcribe/route.ts` — now require an authenticated session (401 otherwise); they're excluded from the gate so they self-guard
Public (un-gated): /login, /auth/*, /share/*, /api/* (self-guarded), static assets.
RLS unchanged (auth.uid()). Pre-auth anonymous data remains orphaned.
REQUIRES Supabase dashboard config: enable Email provider; set Site URL; add <origin>/auth/callback to redirect allowlist.

EF-2 Export Guidelines — COMPLETE
Owner-only download of a capsule's AI guidelines from the Dossier screen.
- `src/app/api/guidelines/[capsuleId]/route.ts` — GET ?format=markdown|text|json; authed server client (RLS owner-scoped); Content-Disposition attachment; 404 when capsule not found/owned; sanitized error bodies
- `src/components/dossier/ExportGuidelinesSheet.tsx` — Sheet with 3 format rows → fetch → blob download
- `src/app/(app)/dossier/[capsuleId]/page.tsx` — Export button in the toolbar (before Public toggle)
- `src/lib/guidelines-generator.ts` — fetchCapsuleData/generateGuidelines accept an optional injected supabase client (FetchOpts); default = service client (EF-1 path unchanged)
No new deps; no service-role key in this path.

EF-1 AI Guidelines Generator — COMPLETE
Given a capsuleId, reads the training corpus and emits Markdown / plain text /
Open-Capsule-Spec JSON. Library only (no UI).
- `src/types/guidelines.ts` — RawCapsuleData, CapsuleIntelligence, outputs
- `src/lib/guidelines/process.ts` — processCapsuleData (pure)
- `src/lib/guidelines/format.ts` — formatAsMarkdown/Text/JSON (pure)
- `src/lib/guidelines-generator.ts` — fetchCapsuleData (service client, server-only) + generateGuidelines orchestrator
- `scripts/ef1-verify.ts` — fixture verification (`npx tsx scripts/ef1-verify.ts`)
Schema-reconciled: verdict 'keep'=approved; feeling moods parsed from the
"{mood} — {text}" content prefix; contextMap keyed by DOMAIN; antiSlopScore =
selectivity (round(100*rejected/(approved+rejected))); unavailable fields
(weight/intensity/strength/contextCondition) tracked in CapsuleIntelligence._unavailable.
No schema migration. Corpus = captures for the capsule's context (+ parent), deduped.

Brand Focus Mode — COMPLETE
Session-only "pin a brand" mode that streamlines capturing into one brand's brandkit.
Components built:
- `src/components/focus/FocusProvider.tsx` — session-only `focusedBrand` context (sessionStorage key `taste.focusedBrand`; clears on tab close)
- `src/components/focus/FocusBar.tsx` — minimal violet bar on Feed (brand name + Exit)
- `src/components/focus/index.ts` — barrel (`FocusProvider`, `useFocus`, `FocusBar`)
- `src/components/capture/FocusContextStep.tsx` — streamlined context screen: pre-filled brand chip, "Is this {brand}?" verdict (keep/reject), inline optional rule, domain, take
- `src/components/icons.tsx` — added `Ic.focus` (target) icon
- `src/app/(app)/contexts/page.tsx` — brand cards gain a focus button (`onEnterFocus`) → enter focus, route to /feed
- `src/app/(app)/layout.tsx` — `FocusProvider` wraps `CaptureProvider`
- `src/app/(app)/feed/page.tsx` — renders `FocusBar`
- `src/components/capture/CaptureProvider.tsx` — renders FocusContextStep when focused; `persistFocusAndDone` dual-row save (primary capture + optional independent `rule` capture), both tagged via `context_ids:[brand.id]`; reaction fast-path also attaches the focused brand
- No DB migration; reuses existing schema

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
- Sharp corners: new Curato components use `borderRadius: 0` on primary buttons and cards
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
