'use client'

import { useEffect, useState } from 'react'
import { FeedCard } from './FeedCard'
import { getRecentCaptures } from '@/lib/captures'
import type { Capture } from '@/types/capture'

export function FeedScreen() {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentCaptures(30)
      .then(setCaptures)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="screen-in" style={{ height: '100%', overflowY: 'auto', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px 12px',
        borderBottom: '1px solid var(--line-soft)',
        position: 'sticky', top: 0, background: 'var(--cream)', zIndex: 5,
      }}>
        <h1 style={{
          fontFamily: 'var(--display)',
          fontSize: 22, fontWeight: 400,
          color: 'var(--ink)',
          letterSpacing: '-0.02em', margin: 0,
        }}>
          Taste
        </h1>
      </div>

      {/* Feed list */}
      <div style={{ padding: '12px 14px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ paddingTop: 48, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12, letterSpacing: '0.04em' }}>
            Loading…
          </div>
        )}
        {!loading && captures.length === 0 && (
          <div className="fade-in" style={{ paddingTop: 60, textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--ink-soft)', letterSpacing: '-0.01em' }}>
              Nothing captured yet.
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>
              Tap + to start.
            </p>
          </div>
        )}
        {captures.map(c => <FeedCard key={c.id} capture={c} />)}
      </div>
    </div>
  )
}
