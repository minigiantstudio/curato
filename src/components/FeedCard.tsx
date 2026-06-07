import type { Capture } from '@/types/capture'
import { CAPTURE_TYPES } from '@/types/capture'

interface FeedCardProps {
  capture: Capture
}

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function FeedCard({ capture }: FeedCardProps) {
  const typeInfo = CAPTURE_TYPES.find(t => t.id === capture.type)
  const verdictColor = capture.verdict === 'keep' ? 'var(--green)' : capture.verdict === 'reject' ? 'var(--red)' : null

  return (
    <div style={{
      background: 'var(--cream-2)',
      borderRadius: 12,
      padding: '14px 14px',
      border: '1px solid var(--line-soft)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Type tile */}
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: typeInfo?.bg ?? 'var(--panel)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          <span>{typeInfo?.label.charAt(0) ?? '?'}</span>
        </div>

        <span className="label" style={{ flex: 1 }}>{typeInfo?.label ?? capture.type}</span>

        {/* Verdict badge */}
        {capture.verdict && (
          <span style={{
            fontSize: 10, letterSpacing: '0.06em',
            color: verdictColor ?? 'var(--ink-faint)',
            fontFamily: 'var(--mono)',
          }}>
            {capture.verdict === 'keep' ? '✓ KEEP' : '✗ REJECT'}
          </span>
        )}

        {/* Timestamp */}
        <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
          {formatRelative(capture.created_at)}
        </span>
      </div>

      {/* Content */}
      {capture.content && (
        <p style={{
          fontSize: 14, color: 'var(--ink)',
          lineHeight: 1.5, margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {capture.type === 'rule' && capture.rule_verb ? (
            <><span style={{ color: 'var(--violet)', fontStyle: 'italic' }}>{capture.rule_verb}</span>{' '}{capture.content}</>
          ) : capture.content}
        </p>
      )}

      {/* Tags */}
      {(capture.tags?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {capture.tags!.map(tag => (
            <span key={tag} style={{
              fontSize: 11, color: 'var(--ink-soft)',
              background: 'var(--panel)', borderRadius: 4,
              padding: '2px 7px', fontFamily: 'var(--mono)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
