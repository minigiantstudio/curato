export interface AgentSuggestion {
  id: string                    // "[captureId]-[suggestionType]-[index]"
  captureId: string
  type: 'tag' | 'domain' | 'context' | 'rule'
  value: string                 // tag name, domain, or context ID
  contextName?: string          // if type is 'context', display name of the brand/project
  ruleVerb?: 'ALWAYS' | 'NEVER' | 'PREFER' | 'AVOID'
  ruleText?: string             // if type is 'rule', the suggested constraint
  confidence: 'high' | 'medium' | 'low'
  dismissed: boolean
  acceptedAt?: string           // ISO timestamp if accepted
}

export interface AgentResponse {
  suggested_tags: string[]      // 2-5 tags
  suggested_domains: string[]   // from: Spatial, Type, Color, Garments, Objects, Sound, Print
  suggested_context_ids: string[] // IDs of brand/project contexts
  extracted_rule: {
    verb: 'ALWAYS' | 'NEVER' | 'PREFER' | 'AVOID'
    text: string
  } | null
}

export type AgentSuggestionType = AgentSuggestion['type']
