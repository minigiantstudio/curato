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
