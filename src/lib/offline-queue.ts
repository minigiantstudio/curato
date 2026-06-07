import type { CaptureInsert } from '@/types/capture'

const KEY = 'taste_offline_queue'

export function queueCapture(data: CaptureInsert): void {
  if (typeof window === 'undefined') return
  const existing = readQueue()
  localStorage.setItem(KEY, JSON.stringify([...existing, { ...data, _queued_at: Date.now() }]))
}

export function readQueue(): CaptureInsert[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function clearQueue(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}

export function queueLength(): number {
  return readQueue().length
}
