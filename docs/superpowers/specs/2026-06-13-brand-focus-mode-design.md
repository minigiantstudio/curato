# Brand Focus Mode — Design

**Date:** 2026-06-13
**Status:** Approved (brainstorm), pending implementation plan

## Problem

When working deeply on a single brand (e.g. Plural Café) for days, every capture
belongs to that brand. Re-selecting the brand context on each capture is friction.
The user wants to "pin" a brand and feel like they are continuously building its
brandkit — capturing good/bad examples and occasional rules with minimal steps.

## Goal

A lightweight, session-only **Brand Focus Mode**: pin one brand as active, and the
capture flow auto-attaches every capture to it through a streamlined context screen.

## Core Decisions (from brainstorm)

1. **Mental model:** persistent *Brand Focus* (session state), not per-capture assignment.
2. **Where it lives:** a persistent **Focus Bar** at the top of the Feed (session state
   that follows you), not a brand-scoped sub-app.
3. **Capture intent:** mixed — each capture can be just a good/bad example, OR a rule
   with evidence. The flow never forces a rule.
4. **Entry / persistence:** enter by tapping a focus affordance on a brand in the
   Contexts (Brands) list. **Session-only** — clears when the app/tab closes.
   Minimal bar: brand name + exit, **no count**.
5. **Data model:** reuse existing schema. No migrations, no new columns.

## Architecture

### FocusProvider (new)

A React context provider wrapping the authenticated app, sibling to `CaptureProvider`.

- **State:** `focusedBrand: Context | null`.
- **Persistence:** in-memory React state, mirrored to `sessionStorage`
  (key `taste.focusedBrand`, stores the serialized `Context`). Rehydrated on mount.
  `sessionStorage` clears when the tab/app closes → satisfies "session-only".
- **API via `useFocus()`:**
  - `focusedBrand: Context | null`
  - `enterFocus(brand: Context): void`
  - `exitFocus(): void`
- **File:** `src/components/focus/FocusProvider.tsx`
- **Wiring:** `src/app/(app)/layout.tsx` wraps children with `<FocusProvider>` *outside*
  `<CaptureProvider>` so the capture flow can read focus state.

### FocusBar (new)

Minimal violet bar shown at the top of the Feed when `focusedBrand != null`.

- Content: a status dot, label "Focused", the brand name, and an "Exit ✕" control.
- Style: `var(--violet)` background, white text, matching the approved mockup
  (`focus-entry.html` option A).
- Tapping "Exit ✕" calls `exitFocus()`.
- **File:** `src/components/focus/FocusBar.tsx`
- **Wiring:** rendered at the top of `src/app/(app)/feed/page.tsx` (FeedScreen),
  above the existing feed header/content. Only the Feed shows the bar (per scope).

### Entry point — Contexts (Brands) list

`src/app/(app)/contexts/page.tsx` brand cards currently navigate to the brand detail
page on tap. To avoid hijacking that navigation, add a dedicated **focus affordance**
(a small target icon-button) to each **brand** card (type `'brand'` only; projects
unaffected).

- Tapping the focus button calls `enterFocus(brand)` then `router.push('/feed')`.
- The card body still navigates to the brand detail page as today.
- **File:** `src/app/(app)/contexts/page.tsx` (modify `ContextCard` for brand rows).

## The focus-capture flow

When `focusedBrand != null`, the capture flow changes only at the context step.

- **TypeSheet:** unchanged (still picks photo/voice/note/etc.).
- **CaptureScreen:** unchanged (camera/voice/etc.).
- **Context step:** `CaptureProvider` renders a new **FocusContextStep** instead of the
  normal `ContextStep` when focus is active. When focus is null, the normal
  `ContextStep` renders unchanged (no regression for non-focus use).

### FocusContextStep (new)

Matches approved mockup `focus-capture.html`. Single screen:

- **Header:** back button, "Context" label, pre-filled violet **brand chip**
  (the focused brand name).
- **Verdict:** reframed as "Is this {brand}?" with two large buttons —
  **Good example** (maps to verdict `keep`) and **Not it**
  (maps to verdict `reject`). Reuse existing `Verdict` type values
  (`'keep' | 'reject' | null`).
- **Inline rule (optional):** a dashed "+ Turn this into a rule" row. Tapping expands
  to verb chips (`ALWAYS/NEVER/PREFER/AVOID`, from `RULE_VERBS`) + a rule-text input.
  Collapsed/empty by default.
- **Domain:** existing domain chips (`DOMAINS`), single-select.
- **Your take:** a textarea (the capture's `content`).
- **Save:** single "Save to {brand} →" button.
- **File:** `src/components/capture/FocusContextStep.tsx`
- **Props:** `{ brand: Context; type: CaptureType; content: string; onBack: () => void;
  onDone: (data: FocusContextData) => void }`
- **`FocusContextData`:** `{ verdict: Exclude<Verdict, null>; domain: string | null;
  take: string; rule: { verb: RuleVerb; text: string } | null }`

### Data flow on save

`CaptureProvider.onContextDone` (or a focus-aware branch) writes captures with the
focused brand auto-attached:

1. **Always:** the primary capture row — its existing `type` (photo/voice/etc.),
   `content` = take, `verdict`, `domains` = `[domain]` if set,
   `context_ids` = `[focusedBrand.id]`. Media uploaded as today.
2. **If a rule was filled:** a **second linked row** — `type: 'rule'`,
   `content` = rule text, `rule_verb` = chosen verb,
   `domains` = `[domain]` if set, `context_ids` = `[focusedBrand.id]`.
   Saved via the same `saveCapture` path (no media).

Both rows already feed the existing agent + Capsule pipeline (which reads captures by
`context_ids` and rules by `rule_verb`). No changes to capsule generation needed.

After save, the existing DoneScreen → "capture again / back to feed" flow is reused.
"Capture again" keeps focus active.

## Scope

**In scope:** FocusProvider, FocusBar (Feed only), brand-card focus affordance,
FocusContextStep, focus-aware branch in CaptureProvider, optional linked rule row.

**Explicitly out (YAGNI):**

- Capture-count badges / progress indicators in the bar.
- Brand quick-switcher.
- Cross-restart persistence (localStorage) — session-only is intended.
- Focus state on Library / Capsule / brand-detail screens.
- Any new DB columns or migrations.
- Changing the non-focus capture flow.

## Files Summary

| File | Change |
|---|---|
| `src/components/focus/FocusProvider.tsx` | Create — context + sessionStorage |
| `src/components/focus/FocusBar.tsx` | Create — minimal Feed bar |
| `src/components/capture/FocusContextStep.tsx` | Create — streamlined context screen |
| `src/app/(app)/layout.tsx` | Modify — wrap with FocusProvider |
| `src/app/(app)/feed/page.tsx` | Modify — render FocusBar when focused |
| `src/app/(app)/contexts/page.tsx` | Modify — focus affordance on brand cards |
| `src/components/capture/CaptureProvider.tsx` | Modify — render FocusContextStep + dual-row save when focused |

## Testing

- FocusProvider: `enterFocus`/`exitFocus` update state and `sessionStorage`;
  rehydrate from `sessionStorage` on mount.
- Dual-row save: with a rule → two rows written with correct `context_ids`;
  without a rule → one row.
- Non-focus regression: with `focusedBrand = null`, normal `ContextStep` renders and
  saves exactly as before.
