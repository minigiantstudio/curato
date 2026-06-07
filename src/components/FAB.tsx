'use client'

import { useCaptureContext } from '@/components/capture'

export function FAB() {
  const { openCapture } = useCaptureContext()
  return (
    <button
      onClick={openCapture}
      aria-label="New capture"
      style={{
        position: 'fixed',
        bottom: 76,
        right: 20,
        width: 52,
        height: 52,
        borderRadius: 26,
        background: 'var(--violet)',
        color: '#fff',
        border: 'none',
        fontSize: 26,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 18px rgba(74,61,176,0.38)',
        zIndex: 15,
        transition: 'transform .12s ease, box-shadow .12s ease',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.07)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(74,61,176,0.48)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 18px rgba(74,61,176,0.38)'
      }}
    >
      +
    </button>
  )
}
