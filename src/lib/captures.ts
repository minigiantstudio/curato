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
