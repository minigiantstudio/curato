'use client'

import { useEffect } from 'react'
import { flushOfflineQueue } from '@/lib/captures'
import { queueLength } from '@/lib/offline-queue'

export function OnlineFlush() {
  useEffect(() => {
    function handleOnline() {
      if (queueLength() > 0) {
        void flushOfflineQueue()
      }
    }
    window.addEventListener('online', handleOnline)
    // also attempt flush on initial mount (in case we came back online)
    handleOnline()
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return null
}
