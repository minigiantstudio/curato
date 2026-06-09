import { createClient, getOrCreateSession } from '@/lib/supabase'
import type { Capsule, CapsuleInsert, CapsuleDiffResult, DistilledRule } from '@/types/capsule'

// ── Read ──────────────────────────────────────────────────────────

/** Latest capsule for a context (newest by created_at). */
export async function getCapsule(contextId: string): Promise<Capsule | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('context_id', contextId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error || !data) return null
  return data as Capsule
}

/** All capsule versions for a context, newest first. */
export async function getCapsuleHistory(contextId: string): Promise<Capsule[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('context_id', contextId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as Capsule[]
}

/** Single capsule by id. */
export async function getCapsuleById(id: string): Promise<Capsule | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Capsule
}

// ── Write ─────────────────────────────────────────────────────────

/** Persist a new capsule version. Returns the saved record. */
export async function saveCapsule(data: CapsuleInsert): Promise<Capsule | null> {
  const supabase = createClient()
  const user = await getOrCreateSession()
  if (!user) return null

  const { data: saved, error } = await supabase
    .from('capsules')
    .insert({ ...data, user_id: user.id, protocol_version: '1' } as never)
    .select()
    .single()
  if (error) { console.error('saveCapsule:', error); return null }
  return saved as Capsule
}

/** Toggle the public visibility of a capsule. */
export async function updateCapsulePublic(id: string, isPublic: boolean): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('capsules')
    .update({ is_public: isPublic } as never)
    .eq('id', id)
  if (error) { console.error('updateCapsulePublic:', error); return false }
  return true
}

// ── Diff ──────────────────────────────────────────────────────────

/** Compute structured diff between two capsule versions. */
export function diffCapsules(v1: Capsule, v2: Capsule): CapsuleDiffResult {
  const words1 = new Set(v1.declaration.toLowerCase().split(/\W+/).filter(Boolean))
  const words2 = new Set(v2.declaration.toLowerCase().split(/\W+/).filter(Boolean))
  const added = Array.from(words2).filter(w => !words1.has(w))
  const removed = Array.from(words1).filter(w => !words2.has(w))

  const ruleKey = (r: DistilledRule) => `${r.verb}|${r.domain}|${r.text}`
  const keys1 = new Set((v1.rules ?? []).map(ruleKey))
  const keys2 = new Set((v2.rules ?? []).map(ruleKey))
  const rulesAdded = (v2.rules ?? []).filter(r => !keys1.has(ruleKey(r)))
  const rulesRemoved = (v1.rules ?? []).filter(r => !keys2.has(ruleKey(r)))
  const rulesUnchanged = (v1.rules ?? []).filter(r => keys2.has(ruleKey(r)))

  const fm1 = v1.frequency_map ?? {}
  const fm2 = v2.frequency_map ?? {}
  const allWords = new Set(Object.keys(fm1).concat(Object.keys(fm2)))
  const increased: CapsuleDiffResult['frequency']['increased'] = []
  const decreased: CapsuleDiffResult['frequency']['decreased'] = []
  const newWords: CapsuleDiffResult['frequency']['new'] = []
  const dropped: CapsuleDiffResult['frequency']['dropped'] = []

  for (const word of Array.from(allWords)) {
    const w1 = fm1[word]
    const w2 = fm2[word]
    if (w1 === undefined && w2 !== undefined) newWords.push({ word, weight: w2 })
    else if (w1 !== undefined && w2 === undefined) dropped.push({ word, weight: w1 })
    else if (w1 !== undefined && w2 !== undefined) {
      if (w2 > w1) increased.push({ word, v1: w1, v2: w2 })
      else if (w2 < w1) decreased.push({ word, v1: w1, v2: w2 })
    }
  }

  return {
    declaration: { v1: v1.declaration, v2: v2.declaration, added, removed },
    rules: { added: rulesAdded, removed: rulesRemoved, unchanged: rulesUnchanged },
    frequency: { increased, decreased, new: newWords, dropped },
  }
}

// ── Version helpers ───────────────────────────────────────────────

/** Compute next version string given the latest existing version. */
export function nextVersion(latest: Capsule | null): string {
  if (!latest) return 'v1.0'
  const match = latest.version.match(/^v(\d+)\.(\d+)$/)
  if (!match) return 'v1.0'
  const minor = parseInt(match[2], 10) + 1
  return `v${match[1]}.${minor}`
}
