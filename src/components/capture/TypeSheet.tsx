'use client'

import { Ic } from '@/components/icons'
import { CAPTURE_TYPES, type CaptureType } from '@/types/capture'

const TYPE_ICONS = {
  photo:      Ic.photo,
  voice:      Ic.voice,
  note:       Ic.note,
  collection: Ic.collection,
  rule:       Ic.rule,
  feeling:    Ic.feeling,
  reaction:   Ic.reaction,
} as const satisfies Record<CaptureType, unknown>

interface TypeSheetProps {
  onSelect: (type: CaptureType) => void
  onClose: () => void
}

export function TypeSheet({ onSelect, onClose }: TypeSheetProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div
        onClick={onClose}
        className="fade-in"
        style={{ flex: 1, background: 'rgba(20,18,16,0.45)', backdropFilter: 'blur(2px)' }}
      />
      <div
        className="sheet-in"
        style={{
          background: 'var(--cream)',
          borderRadius: '16px 16px 0 0',
          padding: '12px 16px 32px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line)', margin: '0 auto 16px' }} />
        <p style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 400, color: 'var(--ink)', marginBottom: 14, letterSpacing: '-0.01em' }}>
          What are you capturing?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {CAPTURE_TYPES.map(t => {
            const Icon = TYPE_ICONS[t.id]
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px', background: 'var(--cream-2)',
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: '1.5px solid var(--line-soft)',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: t.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon width={16} height={16} style={{ color: 'var(--ink)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink)', letterSpacing: '0.01em' }}>{t.label}</div>
                  <div style={{ fontSize: 9, color: 'var(--ink-faint)', marginTop: 1, letterSpacing: '0.02em' }}>{t.hint}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
