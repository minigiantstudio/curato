'use client'

import { Ic } from '@/components/icons'
import { CAPTURE_TYPES, type CaptureType, type Verdict } from '@/types/capture'

export interface SavedEntry {
  type: CaptureType
  content: string
  verdict: Verdict
  domain: string
  tags: string[]
}

interface DoneScreenProps {
  entry: SavedEntry
  onAgain: () => void
  onFeed: () => void
  onCapsule: () => void
}

export function DoneScreen({ entry, onAgain, onFeed, onCapsule }: DoneScreenProps) {
  const typeInfo = CAPTURE_TYPES.find(t => t.id === entry.type)!
  const vc = entry.verdict === 'keep' ? 'var(--green)' : entry.verdict === 'reject' ? 'var(--red)' : 'var(--violet)'
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="screen-in" style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--cream)', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', gap: 24,
    }}>
      {/* Green check circle */}
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: 'var(--green-soft)', border: '2px solid var(--green)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ic.check width={26} height={26} style={{ color: 'var(--green)' }} />
      </div>

      {/* Heading + timestamp */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--display)', fontSize: 20, fontWeight: 400,
          color: 'var(--ink)', letterSpacing: '-0.01em', margin: 0,
        }}>
          Logged to CAPSULE
        </p>
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6, letterSpacing: '0.04em' }}>
          Entry saved · {now}
        </p>
      </div>

      {/* Entry card preview */}
      <div style={{
        width: '100%', background: 'var(--cream-2)', borderRadius: 10,
        border: '1.5px solid var(--line)', padding: '14px',
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
            {typeInfo.label}
          </span>
          {entry.domain && (
            <>
              <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--ink-faint)', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: 'var(--ink-faint)' }}>{entry.domain}</span>
            </>
          )}
          {entry.verdict && (
            <span style={{ marginLeft: 'auto', fontSize: 9, color: vc }}>{entry.verdict}</span>
          )}
        </div>
        {entry.content && (
          <p style={{
            fontSize: 12, color: 'var(--ink)', lineHeight: 1.5,
            marginBottom: 8, maxHeight: 56, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          }}>
            {entry.content}
          </p>
        )}
        {entry.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {entry.tags.map(tg => (
              <span key={tg} style={{
                fontSize: 9, color: 'var(--violet)', border: '1px solid var(--violet)',
                padding: '2px 7px', borderRadius: 8,
              }}>
                {tg}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        <button
          onClick={onAgain}
          style={{
            width: '100%', padding: '14px',
            background: 'var(--violet)', borderRadius: 0, border: 'none',
            color: '#fff', fontSize: 12, letterSpacing: '0.04em', cursor: 'pointer',
            fontFamily: 'var(--mono)',
          }}
        >
          Capture another +
        </button>
        <button
          onClick={onCapsule}
          style={{
            width: '100%', padding: '14px',
            background: 'var(--cream-2)', border: '1.5px solid var(--violet)',
            borderRadius: 0, color: 'var(--violet)', fontSize: 12,
            letterSpacing: '0.04em', cursor: 'pointer',
            fontFamily: 'var(--mono)',
          }}
        >
          See Capsule →
        </button>
        <button
          onClick={onFeed}
          style={{
            width: '100%', padding: '10px',
            background: 'none', border: 'none',
            color: 'var(--ink-faint)', fontSize: 11,
            letterSpacing: '0.04em', cursor: 'pointer',
            fontFamily: 'var(--mono)',
          }}
        >
          Back to feed
        </button>
      </div>
    </div>
  )
}
