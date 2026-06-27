'use client'

import { useRouter } from 'next/navigation'

interface Props {
  todayCount: number
  totalCount: number
  inboxCount: number
  onExport: () => void
}

export function StepRail({ todayCount, totalCount, inboxCount, onExport }: Props) {
  const router = useRouter()

  const rows = [
    {
      num: '01',
      title: 'Inbox',
      sub: inboxCount > 0 ? `${inboxCount} to review` : "you're caught up",
      chip: inboxCount > 0
        ? <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.06em',
            color: '#fff', background: 'var(--violet)',
            padding: '2px 7px', borderRadius: 2, fontWeight: 700,
          }}>{inboxCount}</span>
        : <span style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)', lineHeight: 1,
          }}>✓</span>,
      onClick: () => router.push('/inbox'),
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

  const todayLine = todayCount > 0
    ? <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--violet)', marginTop: 4 }}>{todayCount} logged today</div>
    : null

  return (
    <div style={{ border: '1px solid var(--line-soft)', borderRadius: 0 }}>
      {rows.map((row, i) => (
        <button
          key={row.num}
          onClick={row.onClick}
          style={{
            display: 'flex', alignItems: 'center',
            width: '100%', minHeight: 48,
            padding: '10px 14px',
            background: 'none', border: 'none',
            borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none',
            cursor: 'pointer',
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
            {i === 0 ? todayLine : null}
          </div>
          {row.chip}
        </button>
      ))}
    </div>
  )
}
