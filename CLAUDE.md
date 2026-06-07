# Taste App

Art Director capture and taste synthesis tool. See TASTE_PHASES.md for architecture.

## Current phase
Phase 0 — Foundation
Branch: phase/0-foundation
Only work on items listed under Phase 0 in TASTE_PHASES.md unless asked otherwise.

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
