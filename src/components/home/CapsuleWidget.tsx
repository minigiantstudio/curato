'use client'

import type { CapsuleStats } from '@/lib/guidelines-generator'

interface CapsuleRow {
  id: string
  version: number
  created_at: string
  rules: unknown[]
}

interface Props {
  capsule: CapsuleRow | null
  stats: CapsuleStats | null
  loading: boolean
  onClick?: () => void
}

interface TokenBarProps {
  name: string
  count: number
  max: number
  color: string
  soft: string
  side: 'left' | 'right'
  delay: number
}

function timeAgo(iso: string): string {
  const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

function TokenBar({ name, count, max, color, soft, side, delay }: TokenBarProps) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100)
  return (
    <div style={{
      display: 'flex',
      flexDirection: side === 'left' ? 'row' : 'row-reverse',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    }}>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--ink-faint)', whiteSpace: 'nowrap',
        minWidth: 80,
        textAlign: side === 'left' ? 'right' : 'left',
      }}>
        {side === 'left' ? `← ${name} ${count}` : `${name} ${count} →`}
      </span>
      <div style={{
        flex: 1, height: 7,
        background: soft,
        overflow: 'hidden',
        borderRadius: 2,
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          transformOrigin: side === 'left' ? 'right' : 'left',
          animation: `growW 0.7s cubic-bezier(0.2,0.7,0.2,1) ${delay}ms both`,
        }} />
      </div>
    </div>
  )
}

export function CapsuleWidget({ capsule, stats, loading, onClick }: Props) {
  // Loading skeleton
  if (loading) {
    return (
      <div style={{
        border: '1px solid var(--line-soft)',
        borderRadius: 0,
        overflow: 'hidden',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            height: 20, margin: '10px 16px',
            background: 'var(--cream-2)',
            animation: 'shimmer 1.4s ease infinite',
            animationDelay: `${i * 120}ms`,
            borderRadius: 2,
          }} />
        ))}
      </div>
    )
  }

  // No capsule
  if (!capsule) {
    return (
      <div style={{
        border: '1px solid var(--line-soft)',
        borderRadius: 0,
        padding: '20px 16px',
        fontFamily: 'var(--mono)',
        fontSize: 12,
        color: 'var(--ink-faint)',
      }}>
        No capsule yet — generate one from any brand.
      </div>
    )
  }

  const approved = stats?.approvedTags.slice(0, 4) ?? []
  const rejected = stats?.rejectionPatterns.slice(0, 3) ?? []
  const maxApproved = approved.reduce((m, t) => Math.max(m, t.count), 1)
  const maxRejected = rejected.reduce((m, t) => Math.max(m, t.count), 1)
  const entryCount = stats?.entryCount ?? 0
  const rulesCount = Array.isArray(capsule.rules) ? capsule.rules.length : 0

  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid var(--line-soft)',
        borderRadius: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid var(--line-soft)',
        background: 'var(--cream-2)',
      }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.08em', color: 'var(--ink)',
        }}>◇ CAPSULE</span>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)',
        }}>v{capsule.version}</span>
      </div>

      {/* Divergence grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 0,
        padding: '14px 14px 10px',
        borderBottom: '1px solid var(--line-soft)',
      }}>
        {/* Anchors (approved) */}
        <div style={{ paddingRight: 12, borderRight: '1px solid var(--line-soft)' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em',
            color: 'var(--ink-faint)', marginBottom: 8,
          }}>ANCHORS</div>
          {approved.length === 0
            ? <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)' }}>—</div>
            : approved.map((t, i) => (
              <TokenBar
                key={t.tag}
                name={t.tag}
                count={t.count}
                max={maxApproved}
                color="var(--green)"
                soft="var(--green-soft)"
                side="left"
                delay={i * 90}
              />
            ))}
        </div>

        {/* Rejections */}
        <div style={{ paddingLeft: 12 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em',
            color: 'var(--ink-faint)', marginBottom: 8,
          }}>REJECTION</div>
          {rejected.length === 0
            ? <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)' }}>—</div>
            : rejected.map((t, i) => (
              <TokenBar
                key={t.tag}
                name={t.tag}
                count={t.count}
                max={maxRejected}
                color="var(--red)"
                soft="var(--red-soft)"
                side="right"
                delay={i * 90}
              />
            ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 4,
        borderTop: '1px solid var(--line-soft)',
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
          {entryCount} entries · {rulesCount} rules · trained {timeAgo(capsule.created_at)}
        </span>
        {onClick ? (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--violet)',
            letterSpacing: '0.04em',
          }}>
            View →
          </span>
        ) : (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green)', display: 'inline-block',
            }} />
            MCP ready
          </span>
        )}
      </div>
    </div>
  )
}
