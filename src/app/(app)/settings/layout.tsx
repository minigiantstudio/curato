'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const settingsNav = [
  { href: '/settings/ds', label: 'Design systems', mark: '◈' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cream)' }}>

      {/* ── Settings header ── */}
      <div style={{
        padding: '12px 20px 0',
        background: 'rgba(243,236,221,0.96)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
        borderBottom: '1px solid var(--line-soft)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}
          >
            ←
          </button>
          <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
            Settings
          </span>
        </div>

        {/* ── Settings nav tabs ── */}
        <div style={{ display: 'flex', gap: 0 }}>
          {settingsNav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 0',
                  marginRight: 24,
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  color: active ? 'var(--ink)' : 'var(--stone)',
                  borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
                }}
              >
                <span style={{ fontSize: 14 }}>{item.mark}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      {children}
    </div>
  )
}
