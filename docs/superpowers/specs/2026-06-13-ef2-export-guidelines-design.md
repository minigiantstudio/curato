# EF-2: Export Guidelines — Design

**Date:** 2026-06-13
**Status:** Architecture approved; pending implementation plan
**Builds on:** EF-1 (`src/lib/guidelines-generator.ts`)

## Goal

Let the user export a capsule's AI Guidelines from the Dossier screen as a
downloadable file in any of the three EF-1 formats (Markdown, plain text, JSON),
scoped so only the capsule's owner can export it.

## Confirmed decisions

1. **Export UX:** an "Export" button in the Dossier toolbar opens the existing
   `Sheet` primitive with three rows — Markdown / Plain text / JSON. Tapping a row
   downloads that one file.
2. **Route access:** authenticated, owner-only. The route uses the user's session
   (`createServerSupabaseClient`, cookie-based) so Supabase RLS restricts reads to
   the owner. **No service-role key** is used in this path.

## Architecture

```
Dossier toolbar  →  Export button  →  ExportGuidelinesSheet (3 rows)
                                          │  tap a format
                                          ▼
   GET /api/guidelines/[capsuleId]?format=markdown|text|json
                                          │  authed server client (RLS owner-scoped)
                                          ▼
   generateGuidelines(capsuleId, [format], { supabase })   ← EF-1 lib
                                          │
                                          ▼
   Response: file body + Content-Type + Content-Disposition: attachment
                                          │
                                          ▼
   client: blob → object URL → <a download> → revoke → close sheet
```

### EF-1 tweak — inject an optional Supabase client

`fetchCapsuleData` currently hardcodes the service client. Add an optional second
argument so callers can inject a client:

```ts
type FetchOpts = { supabase?: SupabaseClient }
fetchCapsuleData(capsuleId: string, opts?: FetchOpts): Promise<RawCapsuleData | null>
generateGuidelines(capsuleId: string, formats?: GuidelinesFormat[], opts?: FetchOpts): Promise<GuidelinesOutput>
```

- Default (`opts.supabase` omitted) → use the existing `createServiceClient()`
  (preserves current behavior; no breaking change to EF-1).
- The EF-2 route passes the authenticated server client so reads are owner-scoped
  by RLS. With an authed session, RLS permits the owner to read their own capsule,
  context, and captures (the Dossier page already reads capsules this way).
- `SupabaseClient` type imported from `@supabase/supabase-js`.

## Files

| File | Change |
|---|---|
| `src/lib/guidelines-generator.ts` | Modify — optional injected `supabase` client on `fetchCapsuleData` + `generateGuidelines` |
| `src/app/api/guidelines/[capsuleId]/route.ts` | Create — GET handler |
| `src/components/dossier/ExportGuidelinesSheet.tsx` | Create — 3-format sheet + download trigger |
| `src/app/(app)/dossier/[capsuleId]/page.tsx` | Modify — Export button in toolbar + render sheet |
| `src/components/icons.tsx` | Modify — add a `download` icon if not present |

## API route contract

`GET /api/guidelines/[capsuleId]?format=<markdown|text|json>`

- `format` defaults to `markdown` if missing/unrecognized.
- Builds `createServerSupabaseClient()` (authed, cookies).
- Calls `generateGuidelines(capsuleId, [format], { supabase })`.
- On success returns the body with:
  - markdown → `Content-Type: text/markdown; charset=utf-8`, body = `out.markdown`
  - text → `Content-Type: text/plain; charset=utf-8`, body = `out.text`
  - json → `Content-Type: application/json; charset=utf-8`, body = `JSON.stringify(out.json, null, 2)`
  - `Content-Disposition: attachment; filename="<slug>-guidelines.<ext>"`
- Slug: lower-kebab of context/capsule title + version, e.g. `plural-cafe-v1-2-guidelines.md`.
- Errors:
  - `generateGuidelines` throws "Capsule not found" (RLS-hidden or missing) → `404` JSON `{ error }`.
  - Any other throw → `500` JSON `{ error }`.

## ExportGuidelinesSheet

Props: `{ capsuleId: string; filenameSlug: string; onClose: () => void }`.

- Renders the existing `Sheet` with three tappable rows (Markdown / Plain text / JSON),
  each with a short subtitle ("Human + agent readable", "Copy-paste anywhere",
  "Machine readable · Open Capsule Spec").
- On row tap: `fetch('/api/guidelines/{capsuleId}?format={fmt}')`; if `res.ok`,
  read `blob()`, create an object URL, click a temporary `<a download={filename}>`,
  revoke the URL, then `onClose()`. The download `filename` is derived client-side
  from `filenameSlug` + extension (the server also sets it via Content-Disposition).
- On non-OK response: show an inline error line ("Export failed — try again") and
  keep the sheet open. A per-row loading state ("Preparing…") while fetching.

## Dossier integration

In `src/app/(app)/dossier/[capsuleId]/page.tsx`:

- Add `const [exportOpen, setExportOpen] = useState(false)`.
- Add an "Export" button to the toolbar (next to the public/copy controls), styled
  like the existing toolbar buttons (mono, `var(--panel)`), opening the sheet.
- Render `{exportOpen && <ExportGuidelinesSheet capsuleId={capsule.id} filenameSlug={slug} onClose={() => setExportOpen(false)} />}`.
- Compute `slug` from `context.name` + `capsule.version`.

## Server-only / security

- The route handler is the only importer of `generateGuidelines`; route handlers are
  never client-bundled, so no `server-only` package is required.
- The client `ExportGuidelinesSheet` only calls `fetch` — it never imports the lib,
  so no server code reaches the client bundle.
- No service-role key in this path; RLS + the authed session enforce owner-only reads.

## Testing

- `tsc --noEmit` + `next build`.
- EF-1 regression: `npx tsx scripts/ef1-verify.ts` still passes (the injected-client
  change is additive; default path unchanged).
- Manual (deployed): generate a capsule, open its Dossier, Export each of the three
  formats, confirm each downloads with correct filename + content. Confirm a
  not-owned/missing capsuleId returns 404. This doubles as the EF-1 real-data
  smoke-test (validates fetch → process → format against live data).

## Out of scope (YAGNI)

- No zip bundle, no "download all three" button.
- No new npm dependencies.
- No persistence of exported files (capsules.exported_at is left untouched).
- No changes to the public `/share/[id]` route.
