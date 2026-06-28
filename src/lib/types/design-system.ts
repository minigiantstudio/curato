// ─────────────────────────────────────────────────────────────
// Primitive unions
// ─────────────────────────────────────────────────────────────

export type DSSource = 'github' | 'url' | 'manual'

export type DSSyncStatus = 'pending' | 'connected' | 'syncing' | 'error' | 'never'

export type DSChangeType = 'added' | 'updated' | 'removed' | 'unchanged'

export type DSChangeCategory =
  | 'tokens'
  | 'typography'
  | 'color'
  | 'spacing'
  | 'texture'
  | 'components'
  | 'docs'
  | 'skill'
  | 'rules'
  | 'feelings'

// ─────────────────────────────────────────────────────────────
// Capsule sub-types (used in DSVersion snapshots)
// ─────────────────────────────────────────────────────────────

export interface CapsuleRule {
  id: string
  domain: string
  ruleType: 'ALWAYS' | 'NEVER' | 'PREFER' | 'AVOID'
  statement: string
  strength: number
  contextCondition?: string
}

export interface CapsuleFeeling {
  id: string
  description: string
  intensity: number
  moodTags: string[]
  context?: Record<string, string>
}

export interface CapsuleForSync {
  id: string
  version: string
  title: string
  declaration: string
  rules: CapsuleRule[]
  frequency_map: {
    approved_tags: Array<{ tag: string; count: number }>
    rejected_tags: Array<{ tag: string; count: number }>
    mood_profile: string[]
    anti_slop_score: number | null
  }
}

// ─────────────────────────────────────────────────────────────
// DB row types
// ─────────────────────────────────────────────────────────────

export interface DSConnection {
  id: string
  user_id: string
  name: string
  description: string | null
  context_id: string | null
  source: DSSource
  github_repo: string | null
  github_branch: string | null
  github_path: string | null
  github_pat_encrypted: string | null
  github_skill_path: string | null
  github_tokens_path: string | null
  raw_skill_url: string | null
  raw_tokens_url: string | null
  raw_bundle_url: string | null
  skill_md_url: string | null
  tokens_css_url: string | null
  bundle_js_url: string | null
  last_synced_at: string | null
  last_sync_version: string | null
  last_capsule_version: string | null
  sync_status: DSSyncStatus
  sync_error: string | null
  created_at: string
  updated_at: string
}

export interface DSVersion {
  id: string
  user_id: string
  ds_connection_id: string
  version: string
  title: string
  notes: string | null
  capsule_id: string | null
  capsule_version: string | null
  tokens_snapshot: Record<string, string> | null
  rules_snapshot: CapsuleRule[] | null
  feelings_snapshot: CapsuleFeeling[] | null
  anti_slop_score: number | null
  tokens_css_url: string | null
  readme_patch_url: string | null
  skill_patch_url: string | null
  components_patch_url: string | null
  report_url: string | null
  is_current: boolean
  published_by: string | null
  created_at: string
}

export interface DSChangelog {
  id: string
  user_id: string
  version_id: string
  category: DSChangeCategory
  change_type: DSChangeType
  description: string
  before_value: string | null
  after_value: string | null
  source: string
  created_at: string
}

// ─────────────────────────────────────────────────────────────
// Connect input types
// ─────────────────────────────────────────────────────────────

export interface ConnectGitHubInput {
  source: 'github'
  name: string
  description?: string
  context_id?: string
  github_repo: string
  github_branch: string
  github_skill_path: string
  github_tokens_path: string
  github_pat?: string
}

export interface ConnectURLInput {
  source: 'url'
  name: string
  description?: string
  context_id?: string
  raw_skill_url: string
  raw_tokens_url?: string
  raw_bundle_url?: string
}

export interface ConnectManualInput {
  source: 'manual'
  name: string
  description?: string
  context_id?: string
}

export type ConnectDSInput = ConnectGitHubInput | ConnectURLInput | ConnectManualInput

// ─────────────────────────────────────────────────────────────
// Validation + sync types
// ─────────────────────────────────────────────────────────────

export interface DSValidationResult {
  valid: boolean
  source: DSSource
  skill_md_url: string | null
  tokens_css_url: string | null
  skill_md_preview: string | null
  ds_name_detected: string | null
  error: string | null
}

export interface DSSyncInput {
  ds_connection_id: string
  capsule_id: string
  version: string
  notes?: string
}

export interface DSSyncResult {
  success: boolean
  version_id: string | null
  version: string | null
  changelog: DSChangelog[]
  patch_urls: {
    tokens_css: string | null
    readme: string | null
    skill: string | null
    components: string | null
    report: string | null
  }
  error: string | null
}

// ─────────────────────────────────────────────────────────────
// UI state
// ─────────────────────────────────────────────────────────────

export type ConnectStep =
  | 'choose-source'
  | 'configure'
  | 'validating'
  | 'preview'
  | 'saving'
  | 'success'
