import { createClient, getOrCreateSession } from '@/lib/supabase'
import { queueCapture, readQueue, clearQueue } from '@/lib/offline-queue'
import type { Capture, CaptureInsert, CaptureType } from '@/types/capture'

export async function saveCapture(data: CaptureInsert): Promise<Capture | null> {
  const supabase = createClient()
  const user = await getOrCreateSession()

  if (!user) {
    queueCapture(data)
    return null
  }

  try {
    const { data: capture, error } = await supabase
      .from('captures')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    return capture as Capture
  } catch {
    queueCapture(data)
    return null
  }
}

export async function flushOfflineQueue(): Promise<void> {
  const queue = readQueue()
  if (queue.length === 0) return

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const inserts = queue.map(item => ({ ...item, user_id: user.id }))
  const { error } = await supabase.from('captures').insert(inserts)
  if (!error) clearQueue()
}

export async function getRecentCaptures(limit = 30): Promise<Capture[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as Capture[]
}

export async function getExistingTags(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('captures')
    .select('tags')
    .not('tags', 'eq', '{}')
    .limit(200)
  if (!data) return []
  const all = (data as { tags: string[] }[]).flatMap(r => r.tags ?? [])
  return Array.from(new Set(all)).sort()
}

export async function saveCaptureWithMedia(
  data: CaptureInsert,
  mediaFile?: File,
  mediaFolder: 'photos' | 'audio' = 'photos'
): Promise<Capture | null> {
  const { uploadMedia } = await import('@/lib/storage')
  let mediaUrl: string | undefined
  if (mediaFile) {
    const path = await uploadMedia(mediaFile, mediaFolder)
    if (path) mediaUrl = path
  }
  return saveCapture({ ...data, media_url: mediaUrl })
}

export async function getTodayCaptures(limit = 30): Promise<Capture[]> {
  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as Capture[]
}

export async function getInboxCaptures(limit = 20): Promise<Capture[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .is('verdict', null)
    .in('type', ['photo', 'voice'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('getInboxCaptures:', error); return [] }
  return (data ?? []) as Capture[]
}

export function subscribeToTodayCaptures(
  callback: (captures: Capture[]) => void,
  onError?: (err: Error) => void
): () => void {
  const supabase = createClient()

  const channel = supabase
    .channel('today-captures')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'captures' },
      () => {
        getTodayCaptures().then(callback).catch(err => onError?.(new Error(String(err))))
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function acceptAgentSuggestion(
  captureId: string,
  type: 'tag' | 'domain' | 'context',
  value: string
): Promise<void> {
  const supabase = createClient()
  const { data: capture } = await supabase
    .from('captures')
    .select('tags, domains, context_ids')
    .eq('id', captureId)
    .single()

  if (!capture) return

  const updates: Record<string, string[]> = {}

  if (type === 'tag') {
    const tags = [...(capture.tags ?? [])]
    if (!tags.includes(value)) tags.push(value)
    updates.tags = tags
  } else if (type === 'domain') {
    const domains = [...(capture.domains ?? [])]
    if (!domains.includes(value)) domains.push(value)
    updates.domains = domains
  } else if (type === 'context') {
    const contextIds = [...(capture.context_ids ?? [])]
    if (!contextIds.includes(value)) contextIds.push(value)
    updates.context_ids = contextIds
  }

  await supabase.from('captures').update(updates).eq('id', captureId)
}

export async function acceptAllSuggestions(captureIds: string[]): Promise<void> {
  const supabase = createClient()
  for (const id of captureIds) {
    const { data: capture } = await supabase
      .from('captures')
      .select('ai_tags, ai_domains, ai_suggested_contexts, tags, domains, context_ids')
      .eq('id', id)
      .single()

    if (!capture) continue

    const tags = Array.from(new Set([...(capture.tags ?? []), ...(capture.ai_tags ?? [])]))
    const domains = Array.from(new Set([...(capture.domains ?? []), ...(capture.ai_domains ?? [])]))
    const contextIds = Array.from(new Set([...(capture.context_ids ?? []), ...(capture.ai_suggested_contexts ?? [])]))

    await supabase.from('captures').update({ tags, domains, context_ids: contextIds }).eq('id', id)
  }
}

export interface LibraryFilters {
  query: string
  types: CaptureType[]
  domains: string[]
  verdict: 'keep' | 'reject' | 'unset' | null
  contextId: string | null
  hasMedia: boolean | null
  dateRange: 'week' | 'month' | 'all' | null
}

export async function searchCaptures(
  filters: LibraryFilters,
  page = 0,
  pageSize = 20
): Promise<Capture[]> {
  const supabase = createClient()
  let q = supabase
    .from('captures')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (filters.query.trim()) {
    const term = `%${filters.query.trim()}%`
    q = q.or(`content.ilike.${term},tags.cs.{${filters.query.trim()}}`)
  }

  if (filters.types.length > 0) {
    q = q.in('type', filters.types)
  }

  if (filters.domains.length > 0) {
    q = q.contains('domains', filters.domains)
  }

  if (filters.verdict === 'keep') {
    q = q.eq('verdict', 'keep')
  } else if (filters.verdict === 'reject') {
    q = q.eq('verdict', 'reject')
  } else if (filters.verdict === 'unset') {
    q = q.is('verdict', null)
  }

  if (filters.contextId) {
    q = q.contains('context_ids', [filters.contextId])
  }

  if (filters.hasMedia === true) {
    q = q.not('media_url', 'is', null)
  } else if (filters.hasMedia === false) {
    q = q.is('media_url', null)
  }

  if (filters.dateRange === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    q = q.gte('created_at', d.toISOString())
  } else if (filters.dateRange === 'month') {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    q = q.gte('created_at', d.toISOString())
  }

  const { data, error } = await q
  if (error) { console.error('searchCaptures:', error); return [] }
  return (data ?? []) as Capture[]
}

export async function updateCapture(
  id: string,
  data: Partial<Pick<Capture, 'content' | 'verdict' | 'tags' | 'domains' | 'rule_verb' | 'context_ids'>>
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('captures').update(data).eq('id', id)
  if (error) { console.error('updateCapture:', error); return false }
  return true
}

export async function deleteCapture(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('captures').delete().eq('id', id)
  if (error) { console.error('deleteCapture:', error); return false }
  return true
}

/** NOTE: Not atomic — returns false if any update fails, but successful updates are already committed. */
export async function bulkAssignContext(
  captureIds: string[],
  contextId: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: rows, error: fetchErr } = await supabase
    .from('captures')
    .select('id, context_ids')
    .in('id', captureIds)

  if (fetchErr || !rows) return false

  const updates = (rows as { id: string; context_ids: string[] }[]).map(row => ({
    id: row.id,
    context_ids: Array.from(new Set([...(row.context_ids ?? []), contextId])),
  }))

  const results = await Promise.all(
    updates.map(u =>
      supabase.from('captures').update({ context_ids: u.context_ids }).eq('id', u.id)
    )
  )
  const anyError = results.some(r => r.error)
  if (anyError) { console.error('bulkAssignContext: some updates failed'); return false }
  return true
}

/** NOTE: Not atomic — returns false if any update fails, but successful updates are already committed. */
export async function bulkAddTags(
  captureIds: string[],
  tags: string[]
): Promise<boolean> {
  if (!tags.length) return true
  const supabase = createClient()
  const { data: rows, error: fetchErr } = await supabase
    .from('captures')
    .select('id, tags')
    .in('id', captureIds)

  if (fetchErr || !rows) return false

  const updates = (rows as { id: string; tags: string[] }[]).map(row => ({
    id: row.id,
    tags: Array.from(new Set([...(row.tags ?? []), ...tags])),
  }))

  const results = await Promise.all(
    updates.map(u =>
      supabase.from('captures').update({ tags: u.tags }).eq('id', u.id)
    )
  )
  const anyError = results.some(r => r.error)
  if (anyError) { console.error('bulkAddTags: some updates failed'); return false }
  return true
}
