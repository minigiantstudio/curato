'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getDSConnections, deleteDSConnection } from '@/lib/ds-connections'
import { ConnectModal } from '@/components/ds/ConnectModal'
import type { DSConnection } from '@/lib/types/design-system'

// ── helpers ──────────────────────────────────────────────────

function sourceIcon(source: DSConnection['source']): string {
  if (source === 'github') return '⌥'
  if (source === 'url')    return '◈'
  return '✦'
}

function sourceMeta(conn: DSConnection): string {
  if (conn.source === 'github') return conn.github_repo ?? 'github'
  if (conn.source === 'url')    return 'via URL'
  return 'manual'
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── component ─────────────────────────────────────────────────

export default function DSSettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [connections, setConnections] = useState<DSConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await load(user.id)
    }
    init()
  }, [])

  async function load(uid: string) {
    const all = await getDSConnections(uid)
    setConnections(all)
    setLoading(false)
  }

  async function handleConnectSuccess(id: string) {
    setShowModal(false)
    if (userId) await load(userId)
    router.push('/settings/ds/' + id)
  }

  async function handleDelete(id: string) {
    const ok = window.confirm('Remove this design system connection? Sync history deleted.')
    if (!ok) return
    setDeleting(id)
    try {
      await deleteDSConnection(id)
      setConnections(prev => prev.filter(c => c.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  // ── render ────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes ds-status-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes ds-loading-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.88); }
        }
        .ds-card {
          display: flex;
          align-items: center;
          gap: 0;
          border: 1.5px solid var(--line-soft);
          border-radius: 8px;
          min-height: 72px;
          cursor: pointer;
          background: var(--cream);
          transition: border-color .15s;
          position: relative;
          overflow: hidden;
        }
        .ds-card:hover { border-color: var(--line); }
        .ds-card:hover .ds-delete-btn { opacity: 1; }
        .ds-delete-btn {
          opacity: 0.4;
          transition: opacity .15s;
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: var(--red);
          border-radius: 4px;
          margin-right: 4px;
        }
        .ds-delete-btn:hover { background: var(--red-soft); opacity: 1; }
      `}</style>

      <div style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '32px 20px',
        paddingTop: `calc(env(safe-area-inset-top, 0px) + 32px)`,
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 32px)`,
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 32,
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--display)',
              fontSize: 24,
              fontWeight: 400,
              color: 'var(--ink)',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}>
              Design systems
            </h1>
            <p style={{
              fontFamily: 'var(--mono)',
              fontSize: 14,
              color: 'var(--ink-soft)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              Connect your design system to sync taste from your capsule.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{
              minHeight: 48,
              padding: '0 20px',
              background: 'var(--violet)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'var(--mono)',
              fontSize: 13,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            + Connect
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
            <span style={{
              fontSize: 36,
              color: 'var(--violet)',
              animation: 'ds-loading-pulse 1.4s ease-in-out infinite',
              display: 'block',
            }}>
              ◈
            </span>
          </div>
        )}

        {/* Empty state */}
        {!loading && connections.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '64px 24px',
            textAlign: 'center',
          }}>
            <span style={{
              fontSize: 40,
              color: 'rgba(74,61,176,0.30)',
              display: 'block',
              marginBottom: 16,
            }}>
              ◈
            </span>
            <p style={{
              fontFamily: 'var(--display)',
              fontSize: 18,
              fontWeight: 400,
              color: 'var(--ink)',
              margin: '0 0 10px',
              letterSpacing: '-0.01em',
            }}>
              No design system connected
            </p>
            <p style={{
              fontFamily: 'var(--mono)',
              fontSize: 14,
              color: 'var(--ink-soft)',
              margin: '0 0 24px',
              maxWidth: 320,
              lineHeight: 1.5,
            }}>
              Connect your design system to start syncing your aesthetic taste into SKILL.md.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                minHeight: 48,
                padding: '0 24px',
                background: 'var(--violet)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontFamily: 'var(--mono)',
                fontSize: 13,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              + Connect
            </button>
          </div>
        )}

        {/* Connection list */}
        {!loading && connections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {connections.map(conn => {
              const statusColor =
                conn.sync_status === 'connected' ? 'var(--green)'  :
                conn.sync_status === 'syncing'   ? 'var(--violet)' :
                conn.sync_status === 'error'     ? 'var(--red)'    :
                'var(--ink-faint)'

              const statusLabel =
                conn.sync_status === 'never'    ? 'Never synced' :
                conn.sync_status === 'pending'  ? 'Pending'      :
                conn.sync_status === 'connected'? 'Connected'    :
                conn.sync_status === 'syncing'  ? 'Syncing'      :
                'Error'

              return (
                <div
                  key={conn.id}
                  className="ds-card"
                  onClick={() => router.push('/settings/ds/' + conn.id)}
                >
                  {/* Left section */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, padding: '12px 0 12px 14px', minWidth: 0 }}>
                    {/* Icon box */}
                    <div style={{
                      width: 36,
                      height: 36,
                      background: 'var(--cream-2)',
                      border: '1.5px solid var(--line-soft)',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      color: 'var(--ink-soft)',
                      flexShrink: 0,
                    }}>
                      {sourceIcon(conn.source)}
                    </div>

                    {/* Text */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        margin: '0 0 2px',
                        fontFamily: 'var(--mono)',
                        fontSize: 14,
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {conn.name}
                      </p>
                      <p style={{
                        margin: 0,
                        fontFamily: 'var(--mono)',
                        fontSize: 12,
                        color: 'var(--ink-faint)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {sourceMeta(conn)}
                      </p>
                    </div>
                  </div>

                  {/* Right section */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 3,
                    padding: '12px 10px 12px 0',
                    flexShrink: 0,
                  }}>
                    {/* Status row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: statusColor,
                        display: 'inline-block',
                        animation: conn.sync_status === 'syncing'
                          ? 'ds-status-pulse 1s ease-in-out infinite'
                          : 'none',
                      }} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </div>

                    {conn.last_synced_at && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
                        {formatDate(conn.last_synced_at)}
                      </span>
                    )}

                    {conn.last_sync_version && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--violet)' }}>
                        v{conn.last_sync_version}
                      </span>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    className="ds-delete-btn"
                    onClick={e => { e.stopPropagation(); handleDelete(conn.id) }}
                    title="Remove connection"
                  >
                    {deleting === conn.id ? '…' : '✕'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && userId && (
        <ConnectModal
          userId={userId}
          onSuccess={handleConnectSuccess}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
