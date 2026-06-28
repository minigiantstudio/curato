'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getDSConnections } from '@/lib/ds-connections'
import type { DSConnection, DSSyncResult } from '@/lib/types/design-system'

// ── helpers ──────────────────────────────────────────────────

function incrementVersion(v: string | null): string {
  if (!v) return '1.0'
  const hasV = v.startsWith('v')
  const stripped = hasV ? v.slice(1) : v
  const parts = stripped.split('.')
  const last = parseInt(parts[parts.length - 1], 10)
  if (!isNaN(last)) parts[parts.length - 1] = String(last + 1)
  return (hasV ? 'v' : '') + parts.join('.')
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── component ─────────────────────────────────────────────────

interface SyncButtonProps {
  capsuleId: string
  capsuleVersion: string
}

export function SyncButton({ capsuleId, capsuleVersion }: SyncButtonProps) {
  const [connections, setConnections] = useState<DSConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<DSSyncResult | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [versionInput, setVersionInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [activeDSId, setActiveDSId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const all = await getDSConnections(user.id)
      const healthy = all.filter(c => c.sync_status !== 'error')
      setConnections(healthy)
      if (healthy.length === 1) setActiveDSId(healthy[0].id)
      setLoading(false)
    }
    load()
  }, [])

  async function reloadConnections() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const all = await getDSConnections(user.id)
    setConnections(all.filter(c => c.sync_status !== 'error'))
  }

  async function handleSync() {
    if (!activeDSId || !versionInput.trim() || syncing) return
    setSyncing(activeDSId)
    try {
      const res = await fetch('/api/ds/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ds_connection_id: activeDSId,
          capsule_id: capsuleId,
          capsule_version: capsuleVersion,
          version: versionInput.trim(),
          notes: notesInput.trim() || undefined,
        }),
      })
      const result: DSSyncResult = await res.json()
      setLastResult(result)
      if (result.success) await reloadConnections()
    } finally {
      setSyncing(null)
    }
  }

  // ── render guards ─────────────────────────────────────────

  if (loading) return null

  if (connections.length === 0) {
    return (
      <a
        href="/settings/ds"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 13,
          color: 'var(--violet)',
          textDecoration: 'none',
          display: 'inline-block',
          padding: '4px 0',
        }}
      >
        Connect a design system →
      </a>
    )
  }

  // ── derived state ─────────────────────────────────────────

  const activeConn = connections.find(c => c.id === activeDSId) ?? null
  const syncDisabled = !activeDSId || !versionInput.trim() || !!syncing

  // ── render ────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .ds-sync-pill {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 4px;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          font-weight: 600;
          text-transform: uppercase;
        }
        .ds-sync-pill-added     { background: var(--green-soft);  color: var(--green);  }
        .ds-sync-pill-updated   { background: var(--violet-soft); color: var(--violet); }
        .ds-sync-pill-removed   { background: var(--red-soft);    color: var(--red);    }
        .ds-sync-pill-unchanged { background: var(--cream-2);     color: var(--ink-faint); }
        .ds-dl-link {
          font-family: var(--mono);
          font-size: 12px;
          color: var(--violet);
          text-decoration: none;
          background: var(--violet-soft);
          border: 1px solid rgba(74,61,176,0.2);
          border-radius: 4px;
          padding: 4px 10px;
          display: inline-block;
        }
        .ds-dl-link:hover { background: rgba(74,61,176,0.18); }
      `}</style>

      <div style={{
        border: '1.5px solid var(--line-soft)',
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: 'var(--mono)',
      }}>
        {/* ── Header row ────────────────────────────────── */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            width: '100%',
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 18, color: 'var(--violet)', flexShrink: 0 }}>◈</span>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', letterSpacing: '0.01em' }}>
                Sync to design system
              </p>
              {activeConn?.last_synced_at && (
                <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>
                  Last synced {formatDate(activeConn.last_synced_at)}
                  {activeConn.last_sync_version ? ` · v${activeConn.last_sync_version}` : ''}
                </p>
              )}
            </div>
          </div>
          <span style={{ fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0 }}>
            {expanded ? '▲' : '▼'}
          </span>
        </button>

        {/* ── Expanded body ─────────────────────────────── */}
        {expanded && (
          <div style={{
            borderTop: '1.5px solid var(--line-soft)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            {/* DS selector (only when multiple connections) */}
            {connections.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {connections.map(conn => (
                  <button
                    key={conn.id}
                    onClick={() => setActiveDSId(conn.id)}
                    style={{
                      width: '100%',
                      minHeight: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 12px',
                      background: conn.id === activeDSId ? 'var(--violet-soft)' : 'var(--cream-2)',
                      border: `1.5px solid ${conn.id === activeDSId ? 'var(--violet)' : 'var(--line-soft)'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{conn.name}</span>
                    {conn.last_sync_version && (
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>v{conn.last_sync_version}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Version field */}
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                New DS version
              </p>
              <input
                value={versionInput}
                onChange={e => setVersionInput(e.target.value)}
                placeholder={incrementVersion(activeConn?.last_sync_version ?? null)}
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  background: 'var(--cream-2)',
                  border: '1.5px solid var(--line-soft)',
                  borderRadius: 6,
                  color: 'var(--ink)',
                  fontSize: 14,
                  fontFamily: 'var(--mono)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  minHeight: 48,
                }}
              />
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ink-faint)' }}>
                Semantic version — e.g. 1.0, 2.1, 3.0
              </p>
            </div>

            {/* Notes field */}
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Notes — optional
              </p>
              <input
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
                placeholder="What changed in this capsule version?"
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  background: 'var(--cream-2)',
                  border: '1.5px solid var(--line-soft)',
                  borderRadius: 6,
                  color: 'var(--ink)',
                  fontSize: 13,
                  fontFamily: 'var(--mono)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  minHeight: 48,
                }}
              />
            </div>

            {/* Sync button */}
            <button
              onClick={handleSync}
              disabled={syncDisabled}
              style={{
                width: '100%',
                height: 52,
                background: syncDisabled ? 'var(--line)' : 'var(--violet)',
                color: syncDisabled ? 'var(--ink-faint)' : '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontFamily: 'var(--mono)',
                letterSpacing: '0.04em',
                cursor: syncDisabled ? 'default' : 'pointer',
                transition: 'background .15s',
              }}
            >
              {syncing ? 'Syncing…' : `Sync capsule v${capsuleVersion} →`}
            </button>

            {/* Result panel */}
            {lastResult && (
              <div style={{
                borderRadius: 8,
                padding: '12px 14px',
                background: lastResult.success ? 'var(--green-soft)' : 'var(--red-soft)',
                border: `1px solid ${lastResult.success ? 'var(--green)' : 'var(--red)'}`,
              }}>
                {lastResult.success ? (
                  <>
                    <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
                      ✓ Synced — DS v{lastResult.version}
                    </p>

                    {/* Changelog */}
                    {lastResult.changelog.slice(0, 5).map((entry, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <span className={`ds-sync-pill ds-sync-pill-${entry.change_type}`}>
                          {entry.change_type}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                          {entry.description}
                        </span>
                      </div>
                    ))}

                    {/* Patch downloads */}
                    {(lastResult.patch_urls.tokens_css || lastResult.patch_urls.skill) && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Download patches
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {lastResult.patch_urls.tokens_css && (
                            <a
                              href={lastResult.patch_urls.tokens_css}
                              download="curato-tokens.css"
                              className="ds-dl-link"
                            >
                              tokens.css
                            </a>
                          )}
                          {lastResult.patch_urls.skill && (
                            <a
                              href={lastResult.patch_urls.skill}
                              download="curato-skill-patch.md"
                              className="ds-dl-link"
                            >
                              skill-patch.md
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--red)' }}>
                    ✕ {lastResult.error}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
