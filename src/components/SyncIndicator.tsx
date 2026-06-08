'use client'

import { useEffect, useState } from 'react'
import { queueLength } from '@/lib/offline-queue'
import { flushOfflineQueue } from '@/lib/captures'

export function SyncIndicator() {
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    function check() {
      setPending(queueLength())
    }
    check()
    const iv = setInterval(check, 5000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    function handleOnline() {
      if (queueLength() === 0) return
      setSyncing(true)
      flushOfflineQueue().then(() => {
        setPending(queueLength())
        setSyncing(false)
      })
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  if (pending === 0 && !syncing) return null

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        bottom: 92,
        left: '50%',
        transform: 'translateX(-50%)',
        background: syncing ? 'var(--violet)' : 'var(--ink)',
        color: '#fff',
        fontSize: 11,
        letterSpacing: '0.06em',
        padding: '6px 14px',
        borderRadius: 20,
        zIndex: 50,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {syncing ? 'Syncing…' : `${pending} capture${pending > 1 ? 's' : ''} queued`}
    </div>
  )
}
