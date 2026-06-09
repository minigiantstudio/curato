export interface DistilledRule {
  verb: 'ALWAYS' | 'NEVER' | 'PREFER' | 'AVOID'
  domain: string
  text: string
}

export interface Capsule {
  id: string
  user_id: string
  context_id: string | null
  created_at: string
  version: string            // e.g. "v1.0", "v1.1"
  title: string
  declaration: string
  rules: DistilledRule[]
  frequency_map: Record<string, number>  // word → weight (0.1-1.0)
  exported_at: string | null
  protocol_version: string
  protocol_json_url: string | null
  is_public?: boolean
  dominant_domains?: string[]
  capsule_summary?: string
}

export interface CapsuleInsert {
  context_id: string
  version: string
  title: string
  declaration: string
  rules: DistilledRule[]
  frequency_map: Record<string, number>
}

export interface CapsuleDiffResult {
  declaration: {
    v1: string
    v2: string
    added: string[]
    removed: string[]
  }
  rules: {
    added: DistilledRule[]
    removed: DistilledRule[]
    unchanged: DistilledRule[]
  }
  frequency: {
    increased: Array<{ word: string; v1: number; v2: number }>
    decreased: Array<{ word: string; v1: number; v2: number }>
    new: Array<{ word: string; weight: number }>
    dropped: Array<{ word: string; weight: number }>
  }
}
