'use client'

import type { CSSProperties } from 'react'

type ChipVariant = 'off' | 'on' | 'green-on' | 'red-on'

interface ChipProps {
  label: string
  variant?: ChipVariant
  onClick?: () => void
  className?: string
}

const variantStyles: Record<ChipVariant, CSSProperties> = {
  off: {
    background: 'transparent',
    borderColor: 'var(--line)',
    color: 'var(--ink-soft)',
  },
  on: {
    background: 'var(--violet)',
    borderColor: 'var(--violet)',
    color: '#fff',
  },
  'green-on': {
    background: 'var(--green)',
    borderColor: 'var(--green)',
    color: '#fff',
  },
  'red-on': {
    background: 'var(--red)',
    borderColor: 'var(--red)',
    color: '#fff',
  },
}

export function Chip({ label, variant = 'off', onClick, className }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: 20,
        fontSize: 11,
        letterSpacing: '0.04em',
        border: '1.5px solid',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'border-color .15s, color .15s, background .15s, transform .1s',
        userSelect: 'none',
        fontFamily: 'var(--mono)',
        ...variantStyles[variant],
      }}
    >
      {label}
    </button>
  )
}
