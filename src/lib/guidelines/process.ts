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
