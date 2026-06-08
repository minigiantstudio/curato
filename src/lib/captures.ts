import { createClient } from '@/lib/supabase'
import { queueCapture, readQueue, clearQueue } from '@/lib/offline-queue'
import type { Capture, CaptureInsert } from '@/types/capture'

export async function saveCapture(data: CaptureInsert): Promise<Capture | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
