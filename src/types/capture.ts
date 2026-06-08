export type CaptureType =
  | 'photo' | 'voice' | 'note' | 'collection'
  | 'rule' | 'feeling' | 'reaction'

export type Verdict = 'keep' | 'reject' | null
export type RuleVerb = 'ALWAYS' | 'NEVER' | 'PREFER' | 'AVOID'

export interface Capture {
  id: string
  user_id: string
  created_at: string
  type: CaptureType
  content: string
  verdict: Verdict
  media_url: string | null
  tags: string[]
  domains: string[]
  rule_verb: RuleVerb | null
  context_ids: string[]
  ai_tags: string[]
  ai_domains: string[]
  ai_suggested_contexts: string[]
  ai_processed: boolean
}

export interface CaptureInsert {
  type: CaptureType
  content: string
  verdict?: Verdict
  media_url?: string | null
  tags?: string[]
  domains?: string[]
  rule_verb?: RuleVerb | null
  context_ids?: string[]
}

export interface ContextData {
  verdict: Verdict
  domain: string | null
  tags: string[]
  contextNote: string
}

export interface CaptureFlowData {
  type: CaptureType
  content: string
  ruleVerb: RuleVerb
  ruleDomain: string
  verdict: Verdict
}

export const CAPTURE_TYPES: {
  id: CaptureType
  label: string
  hint: string
  bg: string
}[] = [
  { id: 'photo',      label: 'Photo',      hint: 'Capture something you see',      bg: '#E8C870' },
  { id: 'voice',      label: 'Voice',      hint: 'Speak your reaction aloud',      bg: '#C0DDE4' },
  { id: 'note',       label: 'Note',       hint: 'Write an observation',           bg: '#E8E0D0' },
  { id: 'reaction',   label: 'Reaction',   hint: 'Instant keep or reject',         bg: '#E8D0EC' },
  { id: 'rule',       label: 'Rule',       hint: 'State a hard constraint',        bg: '#CCE0C0' },
  { id: 'feeling',    label: 'Feeling',    hint: 'Log an emotional response',      bg: '#DCC898' },
  { id: 'collection', label: 'Collection', hint: 'Group several references',       bg: '#C8D8E8' },
]

export const DOMAINS = ['Spatial','Type','Color','Garments','Objects','Sound','Print']
export const RULE_VERBS: RuleVerb[] = ['ALWAYS','NEVER','PREFER','AVOID']
export const TAG_SUGGESTIONS = ['restraint','light','material','asymmetry','warmth','patina','negative-space']
export const FEELING_MOODS = ['drawn-in','unsettled','curious','indifferent','repelled']
export const PROJECTS = ['Editorial','Spatial','Identity','Product','Motion','Print','Personal'] as const
