// Server-only: uses the Supabase service-role key. Never import this module from a client component.
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
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
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('fetchCapsuleData: SUPABASE_SERVICE_ROLE_KEY not set; falling back to anon key (RLS-limited reads).')
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(url, key)
}

/** Options for the read functions. Inject `supabase` to use an authed client (RLS-scoped). */
export interface FetchOpts { supabase?: SupabaseClient }

/**
 * STEP 1 — Read the full training corpus for a capsule from Supabase.
 * Resolves the capsule, its context (+ parent), every capture tagged to that
 * context (unioned with the parent context's captures, deduped), and a
 * context_id→name map. Server-only; uses the service client by default.
 *
 * @param capsuleId  capsules.id
 * @param opts.supabase  inject an authed client to scope reads by RLS
 * @returns RawCapsuleData, or null if the capsule cannot be found.
 */
export async function fetchCapsuleData(capsuleId: string, opts?: FetchOpts): Promise<RawCapsuleData | null> {
  const supabase = opts?.supabase ?? createServiceClient()

  const { data: capsuleRow, error: capsuleErr } = await supabase
    .from('capsules').select('*').eq('id', capsuleId).single()
  if (capsuleErr || !capsuleRow) return null

  const contextId: string | null = capsuleRow.context_id ?? null

  let context: RawCapsuleData['context'] = null
  let parentContext: RawCapsuleData['parentContext'] = null
  const contextNames: Record<string, string> = {}

  if (contextId) {
    const { data: ctx, error: ctxErr } = await supabase.from('contexts').select('*').eq('id', contextId).single()
    if (ctxErr) console.warn('fetchCapsuleData: context fetch failed:', ctxErr)
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
    const CAPTURE_LIMIT = 1000
    const { data: own, error: ownErr } = await supabase
      .from('captures').select('*').contains('context_ids', [contextId]).limit(CAPTURE_LIMIT)
    if (ownErr) console.warn('fetchCapsuleData: own-captures fetch failed:', ownErr)
    captures = (own ?? []) as RawCapture[]
    if (captures.length >= CAPTURE_LIMIT) {
      console.warn(`fetchCapsuleData: own-captures hit the ${CAPTURE_LIMIT}-row cap; statistics may be truncated.`)
    }
    if (parentContext) {
      const { data: parentCaps, error: parentErr } = await supabase
        .from('captures').select('*').contains('context_ids', [parentContext.id]).limit(CAPTURE_LIMIT)
      if (parentErr) console.warn('fetchCapsuleData: parent-captures fetch failed:', parentErr)
      if ((parentCaps?.length ?? 0) >= CAPTURE_LIMIT) {
        console.warn(`fetchCapsuleData: parent-captures hit the ${CAPTURE_LIMIT}-row cap; statistics may be truncated.`)
      }
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
  opts?: FetchOpts,
): Promise<GuidelinesOutput> {
  const raw = await fetchCapsuleData(capsuleId, opts)
  if (!raw) throw new Error(`Capsule not found: ${capsuleId}`)

  const intel = processCapsuleData(raw)
  const out: GuidelinesOutput = {}
  if (formats.includes('markdown')) out.markdown = formatAsMarkdown(intel)
  if (formats.includes('text')) out.text = formatAsText(intel)
  if (formats.includes('json')) out.json = formatAsJSON(intel)
  return out
}

// ─────────────────────────────────────────────────────────────────
// Stats data fetcher
//
// Schema mapping (the original spec used fields that don't exist in this DB —
// these are the real-schema equivalents you confirmed):
//   approved entries     → captures with verdict = 'keep'   (no 'approve' exists)
//   rejected entries     → captures with verdict = 'reject'
//   patternTag           → each capture's tags[]            (no patternTag column)
//   patternTag==='ai-slop' → the literal tag 'ai-slop' in tags[]
//   createdAt            → created_at (snake_case)
//   "entries for a capsule" → captures in the capsule's context (entries live on
//                             the context; a capsule is generated from that context)
// Named fetchCapsuleStats (not fetchCapsuleData) so the existing fetchCapsuleData —
// which powers the live /api/guidelines export route — keeps its RawCapsuleData shape.
// ─────────────────────────────────────────────────────────────────

export interface ApprovedTagStat {
  tag: string
  count: number
  /** count / (count + rejected occurrences of the same tag); 0–1, 2 decimals. */
  approvalRate: number
}

export interface RejectionPatternStat {
  tag: string
  count: number
}

export interface CapsuleStats {
  approvedTags: ApprovedTagStat[]      // top 8 by count
  rejectionPatterns: RejectionPatternStat[] // top 6 by count
  antiSlopScore: number
  trainingDays: number
  entryCount: number
}

interface StatRow {
  tags: string[] | null
  created_at: string
}

/** Count tag occurrences across a set of rows. */
function tallyTags(rows: StatRow[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const r of rows) {
    for (const t of r.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return counts
}

/**
 * Fetch aggregate stats for a capsule's training entries.
 * Reuses the service client already configured in this file.
 * Returns empty arrays / zeros when the capsule has no entries yet (not an error).
 *
 * @throws with a message naming the table that failed on any Supabase error.
 */
export async function fetchCapsuleStats(capsuleId: string): Promise<CapsuleStats> {
  const supabase = createServiceClient()
  const empty: CapsuleStats = { approvedTags: [], rejectionPatterns: [], antiSlopScore: 0, trainingDays: 0, entryCount: 0 }

  // 1. Resolve the capsule's context (entries are attached to the context, not the capsule).
  const { data: capsule, error: capsuleErr } = await supabase
    .from('capsules')
    .select('context_id')
    .eq('id', capsuleId)
    .single()
  if (capsuleErr) {
    throw new Error(`fetchCapsuleStats: failed to load capsule "${capsuleId}" (table: capsules): ${capsuleErr.message}`)
  }
  const contextId: string | null = capsule?.context_id ?? null
  if (!contextId) return empty

  // 2. Fetch approved (keep) and rejected (reject) entries in parallel for speed.
  const [approvedRes, rejectedRes] = await Promise.all([
    supabase.from('captures').select('tags, created_at').contains('context_ids', [contextId]).eq('verdict', 'keep'),
    supabase.from('captures').select('tags, created_at').contains('context_ids', [contextId]).eq('verdict', 'reject'),
  ])
  if (approvedRes.error) {
    throw new Error(`fetchCapsuleStats: failed to load approved entries (table: captures): ${approvedRes.error.message}`)
  }
  if (rejectedRes.error) {
    throw new Error(`fetchCapsuleStats: failed to load rejected entries (table: captures): ${rejectedRes.error.message}`)
  }

  const approved = (approvedRes.data ?? []) as StatRow[]
  const rejected = (rejectedRes.data ?? []) as StatRow[]

  // No entries yet → empty result, not an error.
  if (approved.length === 0 && rejected.length === 0) return empty

  const approvedCounts = tallyTags(approved)
  const rejectedCounts = tallyTags(rejected)

  // approvedTags: top 8 by count, with approvalRate = approved / (approved + rejected) for that tag.
  const approvedTags: ApprovedTagStat[] = Array.from(approvedCounts.entries())
    .map(([tag, count]) => {
      const rejectedForTag = rejectedCounts.get(tag) ?? 0
      const total = count + rejectedForTag
      const approvalRate = total === 0 ? 0 : Math.round((count / total) * 100) / 100
      return { tag, count, approvalRate }
    })
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 8)

  // rejectionPatterns: top 6 rejected tags by count.
  const rejectionPatterns: RejectionPatternStat[] = Array.from(rejectedCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 6)

  // antiSlopScore: share of rejections tagged 'ai-slop', doubled, capped at 100.
  const totalRejections = rejected.length
  const aiSlopRejections = rejected.filter(r => (r.tags ?? []).includes('ai-slop')).length
  const antiSlopScore = totalRejections === 0
    ? 0
    : Math.min(100, Math.round((aiSlopRejections / totalRejections) * 100 * 2))

  // trainingDays: distinct calendar dates across all judged entries.
  const days = new Set<string>()
  for (const r of [...approved, ...rejected]) days.add(r.created_at.slice(0, 10))
  const trainingDays = days.size

  return { approvedTags, rejectionPatterns, antiSlopScore, trainingDays, entryCount: approved.length + rejected.length }
}

// ── Manual test ──────────────────────────────────────────────────────────────
// Do NOT add a top-level call here — this module is imported by the /api routes,
// so anything at module scope runs on every server start. To test fetchCapsuleStats,
// use the standalone script:
//   npx tsx --env-file=.env.local scripts/test-stats.ts <capsuleId>
