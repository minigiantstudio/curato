'use client'

interface Props {
  suggestions: string[]
  selected: string[]
  onToggle: (tag: string) => void
}

export function TagRow({ suggestions, selected, onToggle }: Props) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      paddingBottom: 2,
      msOverflowStyle: 'none',
    } as React.CSSProperties}>
      {suggestions.map(tag => {
        const active = selected.includes(tag)
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            style={{
              flexShrink: 0,
              height: 32,
              padding: '0 12px',
              borderRadius: 0,
              border: `1px solid ${active ? 'var(--violet)' : 'rgba(243,236,221,0.25)'}`,
              background: active ? 'var(--violet)' : 'rgba(243,236,221,0.07)',
              color: active ? '#F3ECDD' : 'rgba(243,236,221,0.65)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}
