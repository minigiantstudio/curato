'use client'

import { useRouter } from 'next/navigation'

interface Props {
  todayCount: number
  totalCount: number
  onExport: () => void
}

export function StepRail({ todayCount, totalCount, onExport }: Props) {
  const router = useRouter()

  const rows = [
    {
      num: '01',
      title: 'Capture',
      sub: `${todayCount} logged today`,
      chip: <span style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.06em',
        color: 'var(--violet)', background: 'var(--violet-soft, #f0ebff)',
        padding: '2px 7px', borderRadius: 2, fontWeight: 600,
      }}>TODAY</span>,
      onClick: undefined as (() => void) | undefined,
    },
    {
      num: '02',
      title: 'Library',
      sub: `${totalCount} structured`,
      chip: <span style={{
        fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)', lineHeight: 1,
      }}>✓</span>,
      onClick: () => router.push('/library'),
    },
    {
      num: '03',
      title: 'Export',
      sub: 'Claude · Figma · Canva',
      chip: <span style={{
        fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1,
      }}>→</span>,
      onClick: onExport,
    },
  ]

  return (
    <div style={{ border: '1px solid var(--line-soft)', borderRadius: 0 }}>
      {rows.map((row, i) => (
        <button
          key={row.num}
          onClick={row.onClick}
          disabled={!row.onClick}
          style={{
            display: 'flex', alignItems: 'center',
            width: '100%', minHeight: 48,
            padding: '10px 14px',
            background: 'none', border: 'none',
            borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none',
            cursor: row.onClick ? 'pointer' : 'default',
            textAlign: 'left', gap: 12,
          }}
        >
          <span style={{
            fontFamily: 'var(--display)', fontSize: 12,
            color: i === 0 ? 'var(--violet)' : 'var(--ink-faint)',
            minWidth: 20, flexShrink: 0,
          }}>{row.num}</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
              color: 'var(--ink)', letterSpacing: '0.02em',
            }}>{row.title}</div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10,
              color: 'var(--ink-faint)', marginTop: 1,
            }}>{row.sub}</div>
          </div>
          {row.chip}
        </button>
      ))}
    </div>
  )
}
