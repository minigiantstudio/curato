'use client'

import { useEffect, useState } from 'react'
import { Ic } from '@/components/icons'
import { CAPTURE_TYPES, type CaptureType, type Verdict } from '@/types/capture'

interface DoneScreenProps {
  type: CaptureType
  verdict?: Verdict
  onDismiss: () => void       // tap anywhere / close button
  onViewFeed: () => void      // "View in feed →" link
}

export function DoneScreen({ type, verdict, onDismiss, onViewFeed }: DoneScreenProps) {
  const [show, setShow] = useState(false)
  const typeInfo = CAPTURE_TYPES.find(t => t.id === type)!

  useEffect(() => {
    // slight delay so animation plays after mount
    const t = setTimeout(() => setShow(true), 40)
    // auto-dismiss after 2.2s
    const dismiss = setTimeout(() => onDismiss(), 2200)
    return () => { clearTimeout(t); clearTimeout(dismiss) }
  }, [onDismiss])

  // Verdict colors
  const verdictColor = verdict === 'keep' ? 'var(--green)' : verdict === 'reject' ? 'var(--red)' : 'var(--violet)'
  const verdictBg    = verdict === 'keep' ? 'var(--green-soft)' : verdict === 'reject' ? 'var(--red-soft)' : 'var(--panel)'
  const verdictLabel = verdict === 'keep' ? '✓ KEPT' : verdict === 'reject' ? '✗ REJECTED' : 'CAPTURED'

  return (
    <div
      onClick={onDismiss}
      className="fade-in"
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(20,18,16,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 30,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--cream)',
          borderRadius: 16,
          padding: '28px 24px',
          width: 'calc(100% - 40px)',
          maxWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          transform: show ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(16px)',
          opacity: show ? 1 : 0,
          transition: 'transform .28s cubic-bezier(.34,1.26,.64,1), opacity .22s ease',
        }}
      >
        {/* Type tile */}
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: typeInfo.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
        }}>
          {/* type emoji / icon — use first letter of type as fallback */}
          <span style={{ fontSize: 22, opacity: 0.85 }}>{typeInfo.label.charAt(0)}</span>
        </div>

        {/* Verdict chip */}
        <div style={{
          padding: '5px 14px',
          background: verdictBg,
          border: `1.5px solid ${verdictColor}`,
          borderRadius: 20,
          color: verdictColor,
          fontSize: 11,
          letterSpacing: '0.08em',
          fontFamily: 'var(--mono)',
        }}>
          {verdictLabel}
        </div>

        {/* Confirmation text */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'var(--display)',
            fontSize: 18,
            fontWeight: 400,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            margin: 0,
          }}>
            {typeInfo.label} saved
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4, lineHeight: 1.4 }}>
            {typeInfo.hint}
          </p>
        </div>

        {/* View in feed */}
        <button
          onClick={e => { e.stopPropagation(); onViewFeed() }}
          style={{
            background: 'none', border: 'none',
            color: 'var(--violet)', fontSize: 12,
            letterSpacing: '0.04em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          View in feed <Ic.arrowOut width={12} height={12} />
        </button>

        {/* Close button */}
        <button
          onClick={e => { e.stopPropagation(); onDismiss() }}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none',
            color: 'var(--ink-faint)', cursor: 'pointer', padding: 4,
          }}
        >
          <Ic.close width={16} height={16} />
        </button>
      </div>
    </div>
  )
}
