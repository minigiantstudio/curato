'use client'

import { useEffect, useState } from 'react'
import { FeedCard } from '@/components/feed/FeedCard'
import { AgentTriageStrip } from '@/components/feed/AgentTriageStrip'
import { FocusBar } from '@/components/focus'
import { getTodayCaptures, subscribeToTodayCaptures, acceptAgentSuggestion, acceptAllSuggestions } from '@/lib/captures'
import { getContexts } from '@/lib/contexts'
import { AssignContextSheet } from '@/components/contexts/AssignContextSheet'
import type { Capture } from '@/types/capture'
import type { Context } from '@/types/context'

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase()
}

export default function FeedPage() {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [contexts, setContexts] = useState<Context[]>([])
  const [loading, setLoading] = useState(true)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [assignCapture, setAssignCapture] = useState<Capture | null>(null)

  useEffect(() => {
    getTodayCaptures().then(setCaptures).finally(() => setLoading(false))

    const unsubscribe = subscribeToTodayCaptures(setCaptures, err => {
      console.error('Real-time subscription error:', err)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    getContexts().then(setContexts)
  }, [])

  const rulesCount = captures.filter(c => c.type === 'rule').length

  const handleAcceptSuggestion = async (captureId: string, type: 'tag' | 'domain' | 'context', value: string) => {
    setSuggestionLoading(true)
    try {
      await acceptAgentSuggestion(captureId, type, value)
      const updated = await getTodayCaptures()
      setCaptures(updated)
    } finally {
      setSuggestionLoading(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDismissSuggestion = async (_captureId: string, _type: 'tag' | 'domain' | 'context', _value: string): Promise<void> => {
    // TODO: implement dismiss (remove from ai_* arrays without accepting)
  }

  function handleLongPress(capture: Capture) {
    setAssignCapture(capture)
  }

  function handleAssignSaved(captureId: string, contextIds: string[]) {
    setCaptures(prev =>
      prev.map(c => (c.id === captureId ? { ...c, context_ids: contextIds } : c))
    )
  }

  const handleAcceptAll = async () => {
    setSuggestionLoading(true)
    try {
      const capturesWithSuggestions = captures.filter(
        c => (c.ai_tags?.length ?? 0) + (c.ai_domains?.length ?? 0) + (c.ai_suggested_contexts?.length ?? 0) > 0
      )
      await acceptAllSuggestions(capturesWithSuggestions.map(c => c.id))
      const updated = await getTodayCaptures()
      setCaptures(updated)
    } finally {
      setSuggestionLoading(false)
    }
  }

  return (
    <div className="screen-in" style={{ height: '100%', overflowY: 'auto', background: 'var(--cream)' }}>
      <FocusBar />
      {/* Header */}
      <div
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--line-soft)',
          background: 'rgba(243,236,221,0.96)',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: 'var(--display)',
              fontSize: 20,
              fontWeight: 400,
              letterSpacing: '-0.015em',
              color: 'var(--ink)',
            }}
          >
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
              <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent triage strip */}
      <AgentTriageStrip
        captures={captures}
        contexts={contexts}
        onAcceptSuggestion={handleAcceptSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
        onAcceptAll={handleAcceptAll}
        loading={suggestionLoading}
      />

      {/* Feed list */}
      <div style={{ padding: '10px 20px 100px' }}>
        {!loading && captures.length > 0 && (
          <div style={{ padding: '4px 0 8px' }}>
            <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
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
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>Tap + to start.</p>
          </div>
        )}
        <div className="feed-grid" style={{ columns: 'auto 2', gap: '16px' }}>
          {captures.map(c => (
            <FeedCard
                key={c.id}
                capture={c}
                contexts={contexts}
                onEditContext={() => setAssignCapture(c)}
                onLongPress={handleLongPress}
              />
          ))}
        </div>
      </div>
      <AssignContextSheet
        open={assignCapture !== null}
        capture={assignCapture}
        onClose={() => setAssignCapture(null)}
        onSaved={handleAssignSaved}
      />
    </div>
  )
}
