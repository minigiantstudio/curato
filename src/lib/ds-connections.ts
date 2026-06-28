import { createClient } from '@/lib/supabase'
import type {
  DSConnection,
  DSVersion,
  DSChangelog,
  DSChangeCategory,
  DSChangeType,
  DSSyncStatus,
  ConnectDSInput,
  CapsuleRule,
  CapsuleFeeling,
} from '@/lib/types/design-system'

// ── CONNECTIONS ───────────────────────────────────────────────

export async function getDSConnections(userId: string): Promise<DSConnection[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ds_connections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`getDSConnections: ${error.message}`)
  return (data ?? []) as DSConnection[]
}

export async function getDSConnection(id: string): Promise<DSConnection | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ds_connections')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getDSConnection: ${error.message}`)
  }
  return data as DSConnection
}

export async function createDSConnection(
  userId: string,
  input: ConnectDSInput,
  resolvedUrls: {
    skill_md_url?: string
    tokens_css_url?: string
    bundle_js_url?: string
  }
): Promise<DSConnection> {
  const supabase = createClient()

  const base = {
    user_id: userId,
    name: input.name,
    description: input.description ?? null,
    context_id: input.context_id ?? null,
    source: input.source,
    skill_md_url: resolvedUrls.skill_md_url ?? null,
    tokens_css_url: resolvedUrls.tokens_css_url ?? null,
    bundle_js_url: resolvedUrls.bundle_js_url ?? null,
    sync_status: 'connected' as DSSyncStatus,
  }

  const sourceFields =
    input.source === 'github'
      ? {
          github_repo: input.github_repo,
          github_branch: input.github_branch,
          github_skill_path: input.github_skill_path,
          github_tokens_path: input.github_tokens_path,
          github_pat_encrypted: input.github_pat ?? null,
        }
      : input.source === 'url'
      ? {
          raw_skill_url: input.raw_skill_url,
          raw_tokens_url: input.raw_tokens_url ?? null,
          raw_bundle_url: input.raw_bundle_url ?? null,
        }
      : {}

  const { data, error } = await supabase
    .from('ds_connections')
    .insert({ ...base, ...sourceFields })
    .select()
    .single()

  if (error) throw new Error(`createDSConnection: ${error.message}`)
  return data as DSConnection
}

export async function updateDSSyncStatus(
  id: string,
  status: DSSyncStatus,
  extra?: Partial<DSConnection>,
  client?: ReturnType<typeof createClient>
): Promise<void> {
  const supabase = client ?? createClient()
  const { error } = await supabase
    .from('ds_connections')
    .update({ sync_status: status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id)
  if (error) throw new Error(`updateDSSyncStatus: ${error.message}`)
}

export async function deleteDSConnection(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('ds_connections')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`deleteDSConnection: ${error.message}`)
}

// ── VERSIONS ─────────────────────────────────────────────────

export async function getDSVersions(
  dsConnectionId: string,
  limit = 10
): Promise<DSVersion[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ds_versions')
    .select('*')
    .eq('ds_connection_id', dsConnectionId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`getDSVersions: ${error.message}`)
  return (data ?? []) as DSVersion[]
}

export async function getCurrentDSVersion(
  dsConnectionId: string
): Promise<DSVersion | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ds_versions')
    .select('*')
    .eq('ds_connection_id', dsConnectionId)
    .eq('is_current', true)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getCurrentDSVersion: ${error.message}`)
  }
  return data as DSVersion
}

export async function createDSVersion(
  userId: string,
  dsConnectionId: string,
  capsuleId: string,
  version: string,
  notes: string | null,
  snapshots: {
    tokens_snapshot: Record<string, string> | null
    rules_snapshot: CapsuleRule[] | null
    feelings_snapshot: CapsuleFeeling[] | null
    anti_slop_score: number | null
  },
  client?: ReturnType<typeof createClient>
): Promise<DSVersion> {
  const supabase = client ?? createClient()

  // Demote existing current version — not atomic, but acceptable for single-user DS flow
  await supabase
    .from('ds_versions')
    .update({ is_current: false })
    .eq('ds_connection_id', dsConnectionId)
    .eq('is_current', true)

  const { data, error } = await supabase
    .from('ds_versions')
    .insert({
      user_id: userId,
      ds_connection_id: dsConnectionId,
      capsule_id: capsuleId,
      version,
      title: version,
      notes,
      is_current: true,
      ...snapshots,
    })
    .select()
    .single()

  if (error) throw new Error(`createDSVersion: ${error.message}`)
  return data as DSVersion
}

// ── CHANGELOG ────────────────────────────────────────────────

export async function getDSChangelog(versionId: string): Promise<DSChangelog[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ds_changelog')
    .select('*')
    .eq('version_id', versionId)
    .order('category', { ascending: true })
  if (error) throw new Error(`getDSChangelog: ${error.message}`)
  return (data ?? []) as DSChangelog[]
}

export async function getRecentDSChangelog(
  userId: string,
  dsConnectionId: string,
  limit = 20
): Promise<Array<DSChangelog & { version: string }>> {
  const supabase = createClient()

  // ds_changelog has no ds_connection_id — resolve version IDs first
  const { data: versions, error: vErr } = await supabase
    .from('ds_versions')
    .select('id, version')
    .eq('ds_connection_id', dsConnectionId)
    .eq('user_id', userId)

  if (vErr) throw new Error(`getRecentDSChangelog (versions): ${vErr.message}`)
  if (!versions || versions.length === 0) return []

  const versionMap = Object.fromEntries(versions.map(v => [v.id, v.version]))
  const versionIds = versions.map(v => v.id)

  const { data, error } = await supabase
    .from('ds_changelog')
    .select('*')
    .in('version_id', versionIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getRecentDSChangelog: ${error.message}`)

  return (data ?? []).map(row => ({
    ...(row as DSChangelog),
    version: versionMap[row.version_id] ?? '',
  }))
}

export async function insertChangelogEntries(
  userId: string,
  versionId: string,
  entries: Array<{
    category: DSChangeCategory
    change_type: DSChangeType
    description: string
    before_value?: string
    after_value?: string
    source?: string
  }>,
  client?: ReturnType<typeof createClient>
): Promise<void> {
  if (entries.length === 0) return
  const supabase = client ?? createClient()
  const rows = entries.map(e => ({
    user_id: userId,
    version_id: versionId,
    category: e.category,
    change_type: e.change_type,
    description: e.description,
    before_value: e.before_value ?? null,
    after_value: e.after_value ?? null,
    source: e.source ?? 'system',
  }))
  const { error } = await supabase.from('ds_changelog').insert(rows)
  if (error) throw new Error(`insertChangelogEntries: ${error.message}`)
}
