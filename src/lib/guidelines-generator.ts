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
