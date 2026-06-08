import { createClient } from '@/lib/supabase'
import type { Context, ContextInsert } from '@/types/context'
import type { Capture } from '@/types/capture'

// Re-export type so existing imports from '@/lib/contexts' still work
export type { Context, ContextInsert }

// ── Read ─────────────────────────────────────────────────────────

export async function getContexts(): Promise<Context[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contexts')
    .select('*')
    .eq('archived', false)
    .order('type', { ascending: true })        // brands before projects
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as Context[]
}

export async function getContextById(id: string): Promise<Context | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contexts')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Context
}

/**
 * Returns the context and its parent (if any) in a single round-trip pair.
 */
export async function getContextWithParent(
  id: string
): Promise<{ context: Context; parent: Context | null }> {
  const context = await getContextById(id)
  if (!context) return { context: null as unknown as Context, parent: null }

  let parent: Context | null = null
  if (context.parent_context_id) {
    parent = await getContextById(context.parent_context_id)
  }
  return { context, parent }
}

/**
 * Returns all captures assigned to a specific context.
 * Uses Supabase array-contains filter: context_ids @> [contextId]
 */
export async function getCapturesForContext(contextId: string): Promise<Capture[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .contains('context_ids', [contextId])
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as Capture[]
}

/**
 * Traverses the parent chain and returns rule captures from ancestor contexts,
 * each paired with the context they came from.
 * Max depth: 3 (Personal → Brand → Project).
 */
export async function getInheritedRules(
  contextId: string
): Promise<Array<{ rule: Capture; fromContext: Context }>> {
  const supabase = createClient()
  const result: Array<{ rule: Capture; fromContext: Context }> = []

  // Walk up the parent chain
  let currentId: string | null = contextId
  let depth = 0
  const visited = new Set<string>()

  while (currentId && depth < 4) {
    if (visited.has(currentId)) break
    visited.add(currentId)

    const ctx = await getContextById(currentId)
    if (!ctx) break

    // Collect rules from this ancestor (skip the context itself — we want inherited only)
    if (currentId !== contextId) {
      const { data: rules } = await supabase
        .from('captures')
        .select('*')
        .eq('type', 'rule')
        .contains('context_ids', [currentId])
        .order('created_at', { ascending: false })

      for (const rule of rules ?? []) {
        result.push({ rule: rule as Capture, fromContext: ctx })
      }
    }

    currentId = ctx.parent_context_id
    depth++
  }

  return result
}

/**
 * Returns a map of contextId → capture count for the given IDs.
 * Uses a single query per ID (N queries, but contexts are small sets).
 */
export async function getCaptureCounts(
  contextIds: string[]
): Promise<Record<string, number>> {
  if (contextIds.length === 0) return {}
  const supabase = createClient()
  const counts: Record<string, number> = {}

  await Promise.all(
    contextIds.map(async id => {
      const { count } = await supabase
        .from('captures')
        .select('id', { count: 'exact', head: true })
        .contains('context_ids', [id])
      counts[id] = count ?? 0
    })
  )
  return counts
}

// ── Write ────────────────────────────────────────────────────────

export async function createContext(data: ContextInsert): Promise<Context | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: created, error } = await supabase
    .from('contexts')
    .insert({
      ...data,
      user_id: user.id,
      archived: false,
    })
    .select()
    .single()

  if (error) {
    console.error('createContext error:', error)
    return null
  }
  return created as Context
}

export async function updateContextAssignment(
  captureId: string,
  contextIds: string[]
): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('captures')
    .update({ context_ids: contextIds })
    .eq('id', captureId)
}
