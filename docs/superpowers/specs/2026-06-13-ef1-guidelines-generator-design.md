# EF-1: Auto-generated AI Guidelines Document — Design

**Date:** 2026-06-13
**Status:** Architecture approved; pending implementation plan
**Module:** `src/lib/guidelines-generator.ts`

## Goal

Given a `capsuleId`, read the full training corpus from Supabase and emit three
formats of an "AI Guidelines" document: Markdown (`.md`), plain text (`.txt`),
and Open-Capsule-Spec JSON (`.json`).

## Schema reconciliation (the important part)

The platform has **3 tables only** — `captures` (polymorphic, keyed by `type`),
`contexts` (brand/project), `capsules` (AI-synthesized output, one row per
version). The original feature spec assumed columns that do not exist. Confirmed
resolutions:

| Requested | Reality | Resolution |
|---|---|---|
| `verdict='approve'` | `verdict` ∈ `keep\|reject\|null` | Use `keep`. |
| "entry" | no entry table | **An entry = any capture with a non-null verdict** (type-agnostic). |
| entry `weight` | none | Default `1`; flag in `_unavailable`. |
| `.context` (singular) | `context_ids uuid[]` | Resolve to context **names[]**. |
| rejection `reason`/`patternTag` | rejected capture `content`/`tags[]` | `reason`=content, `patternTags`=tags. |
| rule `ruleType`/`statement` | `rule_verb`/`content` | Direct. |
| rule `strength`/`contextCondition` | none | `null`; flag in `_unavailable`. |
| feeling `description` | `content` = `"{mood} — {text}"` | Full content. |
| feeling `moodTags` | mood prefix in content | Parse on `" — "`, match `FEELING_MOODS`, else `[]`. |
| feeling `intensity` | none | `null`; flag in `_unavailable`. |
| collection `name`/`intent`/`moodTags` | `content` only | `name`=content first line; `intent`=null; `moodTags`=[]. |
| `capsule_version` | `capsules` row | Direct (`capsules.version`). |
| top tags / rejection patterns | aggregate `tags[]` | Derive by frequency (top 8 / top 6). |
| training stats | count + `created_at` span | Derive. |
| `contextMap.screen/print/fabric` | no such surfaces | **Key `contextMap` by DOMAIN** (`Spatial/Type/Color/Garments/Objects/Sound/Print`). |
| `antiSlopScore` | invented | **Selectivity heuristic:** `round(100 * rejected / (approved+rejected))`; `null` if zero verdicts. |
| `references.topImages` | private `media_url` paths (signed URLs expire 1h) | Store **paths** in JSON; omit links from md/txt. |
| `designerName` | anon auth, no profile | Default `context.name`; overridable via `opts`. |

## Confirmed decisions

1. Entry = any capture with a non-null verdict.
2. `contextMap` keyed by **DOMAIN**.
3. `antiSlopScore` = selectivity heuristic above.
4. `weight`/`intensity`/`strength`/`contextCondition` stay `null`/default and are
   listed in `CapsuleIntelligence._unavailable` (no schema migration for EF-1).
5. `designerName` defaults to `context.name`.
6. Images: paths-only in JSON; md/txt reference images by tag/id, never URLs.

## Architecture

```
generateGuidelines(capsuleId, formats?)
  └─ fetchCapsuleData(capsuleId)            // STEP 1 — Supabase reads (server, service client)
        → RawCapsuleData
  └─ processCapsuleData(raw, opts?)         // STEP 2 — pure transform
        → CapsuleIntelligence
  └─ formatAsMarkdown / formatAsText / formatAsJSON   // STEP 3 — pure renderers
        → GuidelinesOutput { markdown?, text?, json? }
```

- **Server-only.** `fetchCapsuleData` uses the **service client** (mirrors
  `src/app/api/capsule/generate/route.ts`); anon RLS would scope reads to the
  current session. `generateGuidelines` therefore runs in an API route / server
  function, never the client.
- **Corpus scope:** all captures where `context_ids` contains the capsule's
  `context_id`, unioned with the parent context's captures (mirrors the existing
  generate route), deduplicated by id.
- **Rules source:** primary = `capsules.rules` (distilled jsonb, authoritative
  for this `capsuleId`), grouped by `verb`. `strength`/`contextCondition` null.
- **Steps 2–3 are pure** (no I/O) → trivially testable and deterministic.

## Types (final)

(See design discussion — these are the contract the implementation must match.)

- `RawCapture`, `RawCapsuleData` — raw read layer, mirrors DB rows.
- `CapsuleIntelligence` — processed contract with `meta`, `aestheticProfile`,
  `rules{always,never,prefer,avoid}`, `feelings`, `contextMap` (keyed by domain),
  `rejectionLog`, `references`, and `_unavailable: string[]` provenance.
- `GuidelinesOutput { markdown?, text?, json? }`, `GuidelinesFormat`.
- JSON output wraps `CapsuleIntelligence` in an Open-Capsule-Spec envelope
  (`$schema`, `specVersion`) — exact envelope TBD in the plan.

Full interface bodies are in the chat design and will be reproduced verbatim in
the implementation plan (no placeholders).

## Tricky parts to watch during build

1. Feeling mood parsing is lossy (prefix split, FEELING_MOODS match, else `[]`).
2. `contextMap` accumulates approved/rejected/rule counts per DOMAIN from each
   capture's `domains[]` (a capture may touch multiple domains).
3. Private media → paths only; never embed expiring signed URLs in a saved file.
4. `_unavailable` must list every derived/missing field so the JSON is honest.

## Out of scope (EF-1)

- No schema migration (no new columns for weight/intensity/strength/etc.).
- No UI / download button (this spec is the generator library only).
- No persistence of generated files (caller decides what to do with outputs).
