'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CaptureProvider } from '@/components/capture'
import { FAB } from '@/components/FAB'
import { SyncIndicator } from '@/components/SyncIndicator'

function BottomNav() {
  const pathname = usePathname()

  const tabs = [
    { href: '/feed', label: 'Feed' },
    { href: '/library', label: 'Library' },
    { href: '/contexts', label: 'Contexts' },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      borderTop: '1px solid var(--dust)',
      background: 'var(--cream)',
      zIndex: 40,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 0',
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              color: active ? 'var(--ink)' : 'var(--stone)',
              borderTop: active ? '2px solid var(--ink)' : '2px solid transparent',
              marginTop: '-1px',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CaptureProvider>
      <div style={{ position: 'relative', height: '100%', overflow: 'hidden', paddingBottom: '52px' }}>
        {children}
        <FAB />
        <SyncIndicator />
        <BottomNav />
      </div>
    </CaptureProvider>
  )
}
