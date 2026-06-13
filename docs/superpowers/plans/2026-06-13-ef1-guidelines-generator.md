# EF-1 AI Guidelines Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given a `capsuleId`, read the training corpus from Supabase and produce an AI-Guidelines document in three formats — Markdown, plain text, and Open-Capsule-Spec JSON.

**Architecture:** Four-stage pipeline — `fetchCapsuleData` (server, service client) → `processCapsuleData` (pure) → `formatAsMarkdown/Text/JSON` (pure) → `generateGuidelines` orchestrator. Public entry point lives at `src/lib/guidelines-generator.ts`; pure internals live under `src/lib/guidelines/`; types in `src/types/guidelines.ts`.

**Tech Stack:** TypeScript, Supabase (`@supabase/supabase-js` service client, mirroring `src/app/api/capsule/generate/route.ts`). No React/UI in this feature.

**Spec:** `docs/superpowers/specs/2026-06-13-ef1-guidelines-generator-design.md`

---

## Testing approach

This repo has **no unit-test framework** (no vitest/jest). Verification per the repo's established pattern is `npx tsc --noEmit` + `npx next build`. In addition, because `processCapsuleData` and the formatters are **pure** and carry the riskiest mapping logic, this plan adds one committed fixture script — `scripts/ef1-verify.ts` — run with `npx tsx` (tsx resolves the `@/*` tsconfig path). It builds a hand-written `RawCapsuleData`, runs it through the pure functions, and asserts key outputs. `fetchCapsuleData` touches live Supabase and is verified by `tsc` + a manual run against a real `capsuleId`.

`pnpm` is unavailable in this environment — use `npx`. `npx tsx` will fetch tsx on first run.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/types/guidelines.ts` | All interfaces: `RawCapture`, `RawCapsuleData`, `CapsuleIntelligence` (+ sub-types), `GuidelinesOutput`, `GuidelinesFormat`, `CapsuleIntelligenceJSON` |
| `src/lib/guidelines/process.ts` | `processCapsuleData` + pure helpers (pure, no I/O) |
| `src/lib/guidelines/format.ts` | `formatAsMarkdown`, `formatAsText`, `formatAsJSON` (pure) |
| `src/lib/guidelines-generator.ts` | `fetchCapsuleData` (Supabase I/O) + `generateGuidelines` orchestrator; re-exports the pure fns |
| `scripts/ef1-verify.ts` | Fixture-based verification of the pure pipeline |

---

## Task 1: Types

**Files:**
- Create: `src/types/guidelines.ts`

- [ ] **Step 1: Write the types file**

```ts
// ── Raw read layer (mirrors DB rows) ──────────────────────────────

/** A captures row, narrowed to the fields the generator consumes. */
export interface RawCapture {
  id: string
  type: 'photo' | 'voice' | 'note' | 'collection' | 'rule' | 'feeling' | 'reaction'
  content: string
  verdict: 'keep' | 'reject' | null
  media_url: string | null
  tags: string[]
  domains: string[]
  rule_verb: 'ALWAYS' | 'NEVER' | 'PREFER' | 'AVOID' | null
  context_ids: string[]
  created_at: string
}

/** A distilled rule as stored in capsules.rules (jsonb). */
export interface RawDistilledRule {
  verb: string
  domain: string
  text: string
}

/** Everything fetchCapsuleData returns, pre-processing. */
export interface RawCapsuleData {
  capsule: {
    id: string
    context_id: string | null
    version: string
    title: string
    declaration: string
    rules: RawDistilledRule[]
    frequency_map: Record<string, number>
    created_at: string
  }
  context: {
    id: string
    name: string
    type: 'brand' | 'project'
    description: string
    parent_context_id: string | null
  } | null
  parentContext: { id: string; name: string } | null
  /** Training corpus: all captures for context_id (+ parent), deduped. */
  captures: RawCapture[]
  /** context_id → name, for resolving context_ids to readable names. */
  contextNames: Record<string, string>
}

// ── Processed contract (CapsuleIntelligence) ──────────────────────

export interface TagFrequency { tag: string; count: number }

export type RuleVerb = 'ALWAYS' | 'NEVER' | 'PREFER' | 'AVOID'

export interface ProcessedRule {
  domain: string
  ruleType: RuleVerb
  statement: string
  strength: number | null          // unavailable in current schema
  contextCondition: string | null  // unavailable in current schema
}

export interface ProcessedFeeling {
  description: string
  moodTags: string[]
  intensity: number | null         // unavailable in current schema
  contexts: string[]
}

export interface ProcessedCollection {
  name: string
  intent: string | null            // unavailable
  moodTags: string[]               // unavailable → []
}

export interface CapsuleIntelligence {
  meta: {
    capsuleId: string
    version: string
    title: string
    designerName: string
    declaration: string
    trainingDays: number
    totalEntries: number
  }
  aestheticProfile: {
    approvedTags: TagFrequency[]
    rejectedTags: TagFrequency[]
    moodProfile: string[]
    antiSlopScore: number | null
  }
  rules: {
    always: ProcessedRule[]
    never: ProcessedRule[]
    prefer: ProcessedRule[]
    avoid: ProcessedRule[]
  }
  feelings: {
    descriptions: string[]
    intensityWeighted: ProcessedFeeling[]
    topMoods: string[]
  }
  /** Keyed by DOMAIN (e.g. Spatial/Type/Color/Print). */
  contextMap: Record<string, { approved: number; rejected: number; rules: number }>
  rejectionLog: {
    topPatterns: TagFrequency[]
    representativeReasons: string[]
  }
  references: {
    topImages: Array<{ id: string; path: string; tags: string[] }>
    collections: ProcessedCollection[]
  }
  /** Provenance: fields with no schema backing (e.g. 'feeling.intensity'). */
  _unavailable: string[]
}

// ── Output layer ──────────────────────────────────────────────────

/** Open-Capsule-Spec JSON envelope wrapping the intelligence object. */
export interface CapsuleIntelligenceJSON extends CapsuleIntelligence {
  $schema: string
  specVersion: string
  generatedAt: string
}

export type GuidelinesFormat = 'markdown' | 'text' | 'json'

export interface GuidelinesOutput {
  markdown?: string
  text?: string
  json?: CapsuleIntelligenceJSON
}
```

- [ ] **Step 2: Verify**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add src/types/guidelines.ts
git commit -m "feat(ef1): guidelines generator types"
```

---

## Task 2: processCapsuleData (pure)

**Files:**
- Create: `src/lib/guidelines/process.ts`

- [ ] **Step 1: Write the processor**

```ts
import { DOMAINS, FEELING_MOODS } from '@/types/capture'
import type {
  RawCapsuleData, RawCapture, CapsuleIntelligence,
  TagFrequency, ProcessedRule, ProcessedFeeling, ProcessedCollection, RuleVerb,
} from '@/types/guidelines'

const VERBS: RuleVerb[] = ['ALWAYS', 'NEVER', 'PREFER', 'AVOID']

/** Count tag occurrences across captures, return top `n` by frequency desc. */
function topTags(captures: RawCapture[], n: number): TagFrequency[] {
  const counts = new Map<string, number>()
  for (const c of captures) {
    for (const t of c.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, n)
}

/** Parse a feeling's mood prefix: content is "{mood} — {text}". */
function parseMood(content: string): string | null {
  const head = content.split(' — ')[0]?.trim() ?? ''
  return (FEELING_MOODS as readonly string[]).includes(head) ? head : null
}

/** Distinct values preserving frequency order (most common first). */
function distinctByFrequency(values: string[]): string[] {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([v]) => v)
}

/**
 * STEP 2 — Transform raw rows into the CapsuleIntelligence contract.
 * Pure: no I/O. Records unavailable fields in `_unavailable`.
 *
 * @param raw  output of fetchCapsuleData
 * @param opts.designerName  overrides meta.designerName (default: context.name)
 */
export function processCapsuleData(
  raw: RawCapsuleData,
  opts?: { designerName?: string },
): CapsuleIntelligence {
  const { capsule, context, captures, contextNames } = raw

  const resolveContexts = (ids: string[]): string[] =>
    (ids ?? []).map(id => contextNames[id]).filter((n): n is string => Boolean(n))

  const approved = captures.filter(c => c.verdict === 'keep')
  const rejected = captures.filter(c => c.verdict === 'reject')

  // ── Rules from distilled capsule.rules, grouped by verb ──
  const grouped: Record<RuleVerb, ProcessedRule[]> = { ALWAYS: [], NEVER: [], PREFER: [], AVOID: [] }
  for (const r of capsule.rules ?? []) {
    const verb = (r.verb ?? '').toUpperCase() as RuleVerb
    if (!VERBS.includes(verb)) continue
    grouped[verb].push({
      domain: r.domain ?? '',
      ruleType: verb,
      statement: r.text ?? '',
      strength: null,
      contextCondition: null,
    })
  }

  // ── Feelings ──
  const feelingCaptures = captures.filter(c => c.type === 'feeling')
  const feelings: ProcessedFeeling[] = feelingCaptures.map(c => {
    const mood = parseMood(c.content)
    return {
      description: c.content,
      moodTags: mood ? [mood] : [],
      intensity: null,
      contexts: resolveContexts(c.context_ids),
    }
  })
  const moodProfile = distinctByFrequency(
    feelingCaptures.map(c => parseMood(c.content)).filter((m): m is string => Boolean(m)),
  )

  // ── contextMap keyed by DOMAIN ──
  const contextMap: CapsuleIntelligence['contextMap'] = {}
  const ensureDomain = (d: string) => {
    if (!contextMap[d]) contextMap[d] = { approved: 0, rejected: 0, rules: 0 }
    return contextMap[d]
  }
  for (const c of captures) {
    for (const d of c.domains ?? []) {
      const bucket = ensureDomain(d)
      if (c.verdict === 'keep') bucket.approved++
      else if (c.verdict === 'reject') bucket.rejected++
    }
  }
  for (const r of capsule.rules ?? []) {
    if (r.domain) ensureDomain(r.domain).rules++
  }

  // ── antiSlopScore: selectivity ──
  const verdictTotal = approved.length + rejected.length
  const antiSlopScore = verdictTotal === 0 ? null : Math.round((100 * rejected.length) / verdictTotal)

  // ── references ──
  const topImages = captures
    .filter(c => c.type === 'photo' && c.media_url)
    .slice(0, 8)
    .map(c => ({ id: c.id, path: c.media_url as string, tags: c.tags ?? [] }))
  const collections: ProcessedCollection[] = captures
    .filter(c => c.type === 'collection')
    .map(c => ({ name: (c.content.split('\n')[0] || c.content).trim(), intent: null, moodTags: [] }))

  // ── meta ──
  const trainingDays = new Set(captures.map(c => c.created_at.slice(0, 10))).size

  return {
    meta: {
      capsuleId: capsule.id,
      version: capsule.version,
      title: capsule.title,
      designerName: opts?.designerName ?? context?.name ?? 'Unknown',
      declaration: capsule.declaration,
      trainingDays,
      totalEntries: verdictTotal,
    },
    aestheticProfile: {
      approvedTags: topTags(approved, 8),
      rejectedTags: topTags(rejected, 6),
      moodProfile,
      antiSlopScore,
    },
    rules: {
      always: grouped.ALWAYS,
      never: grouped.NEVER,
      prefer: grouped.PREFER,
      avoid: grouped.AVOID,
    },
    feelings: {
      descriptions: feelingCaptures.map(c => c.content),
      intensityWeighted: feelings,
      topMoods: moodProfile,
    },
    contextMap,
    rejectionLog: {
      topPatterns: topTags(rejected, 6),
      representativeReasons: rejected.map(c => c.content).filter(Boolean).slice(0, 5),
    },
    references: { topImages, collections },
    _unavailable: [
      'entry.weight', 'rule.strength', 'rule.contextCondition',
      'feeling.intensity', 'collection.intent', 'collection.moodTags',
    ],
  }
}
```

- [ ] **Step 2: Verify types**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add src/lib/guidelines/process.ts
git commit -m "feat(ef1): processCapsuleData pure transform"
```

---

## Task 3: Fixture verification of the processor

**Files:**
- Create: `scripts/ef1-verify.ts`

- [ ] **Step 1: Write the fixture script (processor assertions)**

```ts
import { processCapsuleData } from '@/lib/guidelines/process'
import type { RawCapsuleData } from '@/types/guidelines'

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1) }
}

const fixture: RawCapsuleData = {
  capsule: {
    id: 'cap-1', context_id: 'ctx-1', version: 'v1.2', title: 'Plural Café v1.2',
    declaration: 'Warmth earned through material reality.',
    rules: [
      { verb: 'ALWAYS', domain: 'Color', text: 'warm neutral base' },
      { verb: 'never', domain: 'Type', text: 'no centered body text' },
      { verb: 'PREFER', domain: 'Spatial', text: 'negative space' },
      { verb: 'BOGUS', domain: 'X', text: 'ignored' },
    ],
    frequency_map: { warmth: 0.9, restraint: 0.6 },
    created_at: '2026-06-01T00:00:00Z',
  },
  context: { id: 'ctx-1', name: 'Plural Café', type: 'brand', description: 'A café brand.', parent_context_id: null },
  parentContext: null,
  contextNames: { 'ctx-1': 'Plural Café' },
  captures: [
    { id: 'e1', type: 'photo', content: 'warm tiles', verdict: 'keep', media_url: 'u/photos/1.jpg', tags: ['warmth', 'material'], domains: ['Color'], rule_verb: null, context_ids: ['ctx-1'], created_at: '2026-06-01T10:00:00Z' },
    { id: 'e2', type: 'photo', content: 'cold sign', verdict: 'reject', media_url: 'u/photos/2.jpg', tags: ['cold', 'slop'], domains: ['Color'], rule_verb: null, context_ids: ['ctx-1'], created_at: '2026-06-02T10:00:00Z' },
    { id: 'e3', type: 'feeling', content: 'drawn-in — the light pools', verdict: null, media_url: null, tags: [], domains: ['Spatial'], rule_verb: null, context_ids: ['ctx-1'], created_at: '2026-06-02T11:00:00Z' },
    { id: 'e4', type: 'collection', content: 'Mood board\nsecond line', verdict: null, media_url: null, tags: [], domains: [], rule_verb: null, context_ids: ['ctx-1'], created_at: '2026-06-03T10:00:00Z' },
  ],
}

const intel = processCapsuleData(fixture)

assert(intel.meta.designerName === 'Plural Café', 'designerName falls back to context.name')
assert(intel.meta.totalEntries === 2, 'totalEntries counts only verdict captures (keep+reject)')
assert(intel.meta.trainingDays === 3, 'trainingDays = distinct calendar days')
assert(intel.rules.always.length === 1 && intel.rules.never.length === 1 && intel.rules.prefer.length === 1, 'verbs grouped, lowercase normalized')
assert(intel.rules.avoid.length === 0, 'BOGUS verb is dropped')
assert(intel.aestheticProfile.antiSlopScore === 50, 'antiSlopScore = round(100*1/2)')
assert(intel.aestheticProfile.approvedTags.some(t => t.tag === 'warmth'), 'approved tags aggregated')
assert(intel.aestheticProfile.rejectedTags.some(t => t.tag === 'slop'), 'rejected tags aggregated')
assert(intel.feelings.topMoods[0] === 'drawn-in', 'feeling mood parsed from content prefix')
assert(intel.contextMap.Color.approved === 1 && intel.contextMap.Color.rejected === 1, 'contextMap keyed by domain')
assert(intel.references.topImages.length === 2, 'topImages from photo media_url paths')
assert(intel.references.collections[0].name === 'Mood board', 'collection name = first content line')
assert(intel._unavailable.includes('feeling.intensity'), 'unavailable provenance recorded')

console.log('ef1-verify: processor OK')
```

- [ ] **Step 2: Run the verification**

Run: `cd "Taste App/taste" && npx tsx scripts/ef1-verify.ts`
Expected output: `ef1-verify: processor OK` (exit 0). If any assert fails it prints `FAIL: ...` and exits 1 — fix `process.ts`, not the assertions, unless an assertion is genuinely wrong.

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add scripts/ef1-verify.ts
git commit -m "test(ef1): fixture verification for processCapsuleData"
```

---

## Task 4: Formatters (pure)

**Files:**
- Create: `src/lib/guidelines/format.ts`
- Modify: `scripts/ef1-verify.ts` (append formatter assertions)

- [ ] **Step 1: Write the formatters**

```ts
import type {
  CapsuleIntelligence, CapsuleIntelligenceJSON, ProcessedRule,
} from '@/types/guidelines'

const SPEC_SCHEMA = 'https://taste.app/schemas/open-capsule-spec.json'
const SPEC_VERSION = '1.0'

function ruleLines(rules: ProcessedRule[]): string[] {
  return rules.map(r => (r.domain ? `- (${r.domain}) ${r.statement}` : `- ${r.statement}`))
}

/** STEP 3a — Markdown (human + agent readable). */
export function formatAsMarkdown(intel: CapsuleIntelligence): string {
  const m = intel.meta
  const lines: string[] = []
  lines.push(`# ${m.title} — AI Guidelines`)
  lines.push('')
  lines.push(`> ${m.declaration}`)
  lines.push('')
  lines.push(`**Designer:** ${m.designerName}  `)
  lines.push(`**Version:** ${m.version}  `)
  lines.push(`**Trained:** ${m.trainingDays} days · ${m.totalEntries} judged entries  `)
  const slop = intel.aestheticProfile.antiSlopScore
  lines.push(`**Selectivity (anti-slop):** ${slop === null ? 'n/a' : `${slop}/100`}`)
  lines.push('')

  lines.push('## Aesthetic profile')
  lines.push(`**Approved signals:** ${intel.aestheticProfile.approvedTags.map(t => `${t.tag} (${t.count})`).join(', ') || '—'}`)
  lines.push('')
  lines.push(`**Rejected patterns:** ${intel.aestheticProfile.rejectedTags.map(t => `${t.tag} (${t.count})`).join(', ') || '—'}`)
  lines.push('')
  lines.push(`**Mood profile:** ${intel.aestheticProfile.moodProfile.join(', ') || '—'}`)
  lines.push('')

  lines.push('## Rules')
  for (const [label, rules] of [
    ['ALWAYS', intel.rules.always], ['NEVER', intel.rules.never],
    ['PREFER', intel.rules.prefer], ['AVOID', intel.rules.avoid],
  ] as const) {
    lines.push(`### ${label}`)
    lines.push(rules.length ? ruleLines(rules).join('\n') : '- —')
    lines.push('')
  }

  lines.push('## Feelings')
  lines.push(intel.feelings.descriptions.length ? intel.feelings.descriptions.map(d => `- ${d}`).join('\n') : '- —')
  lines.push('')

  lines.push('## Domain map')
  const domainRows = Object.entries(intel.contextMap)
  lines.push('| Domain | Approved | Rejected | Rules |')
  lines.push('| --- | --- | --- | --- |')
  for (const [d, v] of domainRows) lines.push(`| ${d} | ${v.approved} | ${v.rejected} | ${v.rules} |`)
  if (!domainRows.length) lines.push('| — | 0 | 0 | 0 |')
  lines.push('')

  lines.push('## Rejection log')
  lines.push(intel.rejectionLog.representativeReasons.length
    ? intel.rejectionLog.representativeReasons.map(r => `- ${r}`).join('\n')
    : '- —')
  lines.push('')

  if (intel.references.collections.length) {
    lines.push('## Collections')
    lines.push(intel.references.collections.map(c => `- ${c.name}`).join('\n'))
    lines.push('')
  }
  if (intel.references.topImages.length) {
    lines.push('## Reference images')
    lines.push(intel.references.topImages.map(i => `- ${i.id} (${i.tags.join(', ') || 'untagged'})`).join('\n'))
    lines.push('')
  }

  lines.push('---')
  lines.push(`_Generated from Taste capsule ${m.capsuleId}. Unavailable fields: ${intel._unavailable.join(', ')}._`)
  return lines.join('\n')
}

/** STEP 3b — Plain text for copy-paste. */
export function formatAsText(intel: CapsuleIntelligence): string {
  const m = intel.meta
  const out: string[] = []
  const rule = (s: string) => out.push(s)
  rule(`${m.title} — AI GUIDELINES`)
  rule('='.repeat(48))
  rule(m.declaration)
  rule('')
  rule(`Designer: ${m.designerName}`)
  rule(`Version: ${m.version}`)
  rule(`Trained: ${m.trainingDays} days, ${m.totalEntries} judged entries`)
  const slop = intel.aestheticProfile.antiSlopScore
  rule(`Selectivity: ${slop === null ? 'n/a' : `${slop}/100`}`)
  rule('')
  rule('APPROVED SIGNALS: ' + (intel.aestheticProfile.approvedTags.map(t => `${t.tag} (${t.count})`).join(', ') || '-'))
  rule('REJECTED PATTERNS: ' + (intel.aestheticProfile.rejectedTags.map(t => `${t.tag} (${t.count})`).join(', ') || '-'))
  rule('MOOD: ' + (intel.aestheticProfile.moodProfile.join(', ') || '-'))
  rule('')
  for (const [label, rules] of [
    ['ALWAYS', intel.rules.always], ['NEVER', intel.rules.never],
    ['PREFER', intel.rules.prefer], ['AVOID', intel.rules.avoid],
  ] as const) {
    rule(`${label}:`)
    if (rules.length) for (const r of rules) rule(`  - ${r.domain ? `(${r.domain}) ` : ''}${r.statement}`)
    else rule('  - -')
  }
  rule('')
  rule('FEELINGS:')
  if (intel.feelings.descriptions.length) for (const d of intel.feelings.descriptions) rule(`  - ${d}`)
  else rule('  - -')
  rule('')
  rule('REJECTION LOG:')
  if (intel.rejectionLog.representativeReasons.length) for (const r of intel.rejectionLog.representativeReasons) rule(`  - ${r}`)
  else rule('  - -')
  rule('')
  rule(`(Unavailable: ${intel._unavailable.join(', ')})`)
  return out.join('\n')
}

/** STEP 3c — Open-Capsule-Spec JSON object (machine readable). */
export function formatAsJSON(intel: CapsuleIntelligence): CapsuleIntelligenceJSON {
  return {
    $schema: SPEC_SCHEMA,
    specVersion: SPEC_VERSION,
    generatedAt: new Date().toISOString(),
    ...intel,
  }
}
```

- [ ] **Step 2: Append formatter assertions to `scripts/ef1-verify.ts`**

Add these imports to the top of `scripts/ef1-verify.ts` (alongside the existing import):

```ts
import { formatAsMarkdown, formatAsText, formatAsJSON } from '@/lib/guidelines/format'
```

And append at the end of the file (after the existing `console.log`):

```ts
const md = formatAsMarkdown(intel)
assert(md.includes('# Plural Café v1.2 — AI Guidelines'), 'markdown has title heading')
assert(md.includes('Warmth earned through material reality.'), 'markdown includes declaration')
assert(md.includes('### ALWAYS') && md.includes('warm neutral base'), 'markdown lists ALWAYS rule')
assert(md.includes('| Color |'), 'markdown domain map row')

const txt = formatAsText(intel)
assert(txt.includes('AI GUIDELINES'), 'text header present')
assert(txt.includes('ALWAYS:'), 'text rules section present')

const json = formatAsJSON(intel)
assert(json.specVersion === '1.0' && typeof json.generatedAt === 'string', 'json envelope present')
assert(json.meta.capsuleId === 'cap-1', 'json carries intelligence')
assert(Array.isArray(json._unavailable), 'json keeps provenance')

console.log('ef1-verify: formatters OK')
```

- [ ] **Step 3: Verify**

Run: `cd "Taste App/taste" && npx tsc --noEmit && npx tsx scripts/ef1-verify.ts`
Expected: tsc clean; script prints `ef1-verify: processor OK` then `ef1-verify: formatters OK`.

- [ ] **Step 4: Commit**

```bash
cd "Taste App/taste"
git add src/lib/guidelines/format.ts scripts/ef1-verify.ts
git commit -m "feat(ef1): markdown/text/json formatters + fixture assertions"
```

---

## Task 5: fetchCapsuleData + generateGuidelines orchestrator

**Files:**
- Create: `src/lib/guidelines-generator.ts`

- [ ] **Step 1: Write the fetcher + orchestrator**

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { processCapsuleData } from '@/lib/guidelines/process'
import { formatAsMarkdown, formatAsText, formatAsJSON } from '@/lib/guidelines/format'
import type {
  RawCapsuleData, RawCapture, GuidelinesFormat, GuidelinesOutput,
} from '@/types/guidelines'

export { processCapsuleData } from '@/lib/guidelines/process'
export { formatAsMarkdown, formatAsText, formatAsJSON } from '@/lib/guidelines/format'

/** Service-role Supabase client (server-only; bypasses anon RLS like capsule/generate). */
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(url, key)
}

/**
 * STEP 1 — Read the full training corpus for a capsule from Supabase.
 * Resolves the capsule, its context (+ parent), every capture tagged to that
 * context (unioned with the parent context's captures, deduped), and a
 * context_id→name map. Server-only; uses the service client.
 *
 * @param capsuleId  capsules.id
 * @returns RawCapsuleData, or null if the capsule cannot be found.
 */
export async function fetchCapsuleData(capsuleId: string): Promise<RawCapsuleData | null> {
  const supabase = createServiceClient()

  const { data: capsuleRow, error: capsuleErr } = await supabase
    .from('capsules').select('*').eq('id', capsuleId).single()
  if (capsuleErr || !capsuleRow) return null

  const contextId: string | null = capsuleRow.context_id ?? null

  let context: RawCapsuleData['context'] = null
  let parentContext: RawCapsuleData['parentContext'] = null
  const contextNames: Record<string, string> = {}

  if (contextId) {
    const { data: ctx } = await supabase.from('contexts').select('*').eq('id', contextId).single()
    if (ctx) {
      context = {
        id: ctx.id, name: ctx.name, type: ctx.type,
        description: ctx.description ?? '', parent_context_id: ctx.parent_context_id ?? null,
      }
      contextNames[ctx.id] = ctx.name
      if (ctx.parent_context_id) {
        const { data: parent } = await supabase
          .from('contexts').select('id, name').eq('id', ctx.parent_context_id).single()
        if (parent) {
          parentContext = { id: parent.id, name: parent.name }
          contextNames[parent.id] = parent.name
        }
      }
    }
  }

  // Corpus: captures for this context (+ parent), deduped by id.
  let captures: RawCapture[] = []
  if (contextId) {
    const { data: own } = await supabase.from('captures').select('*').contains('context_ids', [contextId])
    captures = (own ?? []) as RawCapture[]
    if (parentContext) {
      const { data: parentCaps } = await supabase
        .from('captures').select('*').contains('context_ids', [parentContext.id])
      const seen = new Set(captures.map(c => c.id))
      for (const c of (parentCaps ?? []) as RawCapture[]) if (!seen.has(c.id)) captures.push(c)
    }
  }

  return {
    capsule: {
      id: capsuleRow.id, context_id: contextId, version: capsuleRow.version,
      title: capsuleRow.title ?? '', declaration: capsuleRow.declaration ?? '',
      rules: capsuleRow.rules ?? [], frequency_map: capsuleRow.frequency_map ?? {},
      created_at: capsuleRow.created_at,
    },
    context, parentContext, captures, contextNames,
  }
}

/**
 * STEP 4 — Orchestrate: fetch → process → format into requested outputs.
 *
 * @param capsuleId
 * @param formats   which outputs to produce (default: all three)
 * @returns only the requested keys populated.
 * @throws if the capsule cannot be found.
 */
export async function generateGuidelines(
  capsuleId: string,
  formats: GuidelinesFormat[] = ['markdown', 'text', 'json'],
): Promise<GuidelinesOutput> {
  const raw = await fetchCapsuleData(capsuleId)
  if (!raw) throw new Error(`Capsule not found: ${capsuleId}`)

  const intel = processCapsuleData(raw)
  const out: GuidelinesOutput = {}
  if (formats.includes('markdown')) out.markdown = formatAsMarkdown(intel)
  if (formats.includes('text')) out.text = formatAsText(intel)
  if (formats.includes('json')) out.json = formatAsJSON(intel)
  return out
}
```

- [ ] **Step 2: Verify types**

Run: `cd "Taste App/taste" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add src/lib/guidelines-generator.ts
git commit -m "feat(ef1): fetchCapsuleData + generateGuidelines orchestrator"
```

---

## Task 6: Final verification + docs

**Files:**
- Modify: `Taste App/taste/CLAUDE.md`

- [ ] **Step 1: Full pipeline checks**

Run: `cd "Taste App/taste" && npx tsc --noEmit && npx tsx scripts/ef1-verify.ts && npx next build`
Expected: tsc clean; both `ef1-verify` lines print; build succeeds.

- [ ] **Step 2: Document in CLAUDE.md**

Add after the existing feature notes near the top of `Taste App/taste/CLAUDE.md`:

```markdown
EF-1 AI Guidelines Generator — COMPLETE
Given a capsuleId, reads the training corpus and emits Markdown / plain text /
Open-Capsule-Spec JSON.
- `src/types/guidelines.ts` — RawCapsuleData, CapsuleIntelligence, outputs
- `src/lib/guidelines/process.ts` — processCapsuleData (pure)
- `src/lib/guidelines/format.ts` — formatAsMarkdown/Text/JSON (pure)
- `src/lib/guidelines-generator.ts` — fetchCapsuleData (service client) + generateGuidelines orchestrator
- `scripts/ef1-verify.ts` — fixture verification (npx tsx)
Schema-reconciled: verdict 'keep'=approved; feeling moods parsed from content
prefix; contextMap keyed by DOMAIN; antiSlopScore = selectivity; unavailable
fields (weight/intensity/strength/contextCondition) tracked in _unavailable.
No schema migration; no UI (library only).
```

- [ ] **Step 3: Commit**

```bash
cd "Taste App/taste"
git add CLAUDE.md
git commit -m "docs: record EF-1 guidelines generator in CLAUDE.md"
```

---

## Self-Review notes

- **Spec coverage:** STEP 1 fetch (Task 5), STEP 2 process (Task 2), STEP 3 formatters (Task 4), STEP 4 orchestrator (Task 5). Types (Task 1). Confirmed decisions all encoded: entry=verdict capture, contextMap by DOMAIN, antiSlopScore selectivity, `_unavailable` provenance, designerName=context.name, image paths-only.
- **Type consistency:** `RawCapsuleData`/`CapsuleIntelligence`/`GuidelinesOutput`/`CapsuleIntelligenceJSON` defined in Task 1 and consumed unchanged in Tasks 2/4/5. `processCapsuleData`, `formatAs*`, `fetchCapsuleData`, `generateGuidelines` signatures match the spec.
- **No placeholders:** every step has complete code; the fixture script asserts real values; no TODOs.
- **Out of scope confirmed:** no schema migration, no UI/download button, no file persistence.
