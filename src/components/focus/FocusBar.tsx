'use client'

import { useFocus } from './FocusProvider'

export function FocusBar() {
  const { focusedBrand, exitFocus } = useFocus()
  if (!focusedBrand) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '10px 16px 0',
        padding: '11px 14px',
        background: 'var(--violet)',
        borderRadius: 12,
        color: '#fff',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#9ef0c4',
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>
          Focused
        </span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{focusedBrand.name}</span>
      </div>
      <button
        onClick={exitFocus}
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: '#fff',
          opacity: 0.85,
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 20,
          padding: '4px 11px',
          background: 'none',
          cursor: 'pointer',
        }}
      >
        Exit ✕
      </button>
    </div>
  )
}
