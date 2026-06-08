'use client'

import { useEffect, useState } from 'react'
import { FeedCard } from './FeedCard'
import { getRecentCaptures } from '@/lib/captures'
import type { Capture } from '@/types/capture'

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase()
}

export function FeedScreen() {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentCaptures(30)
      .then(setCaptures)
      .finally(() => setLoading(false))
  }, [])

  const rulesCount = captures.filter(c => c.type === 'rule').length

  return (
    <div className="screen-in" style={{ height: '100%', overflowY: 'auto', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '1px solid var(--line-soft)',
        background: 'rgba(243,236,221,0.96)',
        position: 'sticky', top: 0, zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: 'var(--display)', fontSize: 20, fontWeight: 400,
            letterSpacing: '-0.015em', color: 'var(--ink)',
          }}>
            Today&#39;s records
          </span>
          <span style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--ink-faint)' }}>
            {todayLabel()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {([
            [String(captures.length), 'entries'],
            [String(rulesCount), 'rules'],
            ['v0.1', 'capsule'],
          ] as [string, string][]).map(([n, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 400, color: 'var(--ink)' }}>{n}</span>
              <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feed list */}
      <div style={{ padding: '10px 20px 100px' }}>
        {!loading && captures.length > 0 && (
          <div style={{ padding: '4px 0 8px' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              Latest captures
            </span>
          </div>
        )}
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {captures.map(c => <FeedCard key={c.id} capture={c} />)}
        </div>
      </div>
    </div>
  )
}
