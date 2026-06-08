'use client'

import { useRef } from 'react'
import { Ic } from '@/components/icons'
import type { Capture } from '@/types/capture'
import type { Context } from '@/lib/contexts'

interface AgentTriageStripProps {
  captures: Capture[]
  contexts: Context[]
  onAcceptSuggestion: (captureId: string, type: 'tag' | 'domain' | 'context', value: string) => Promise<void>
  onDismissSuggestion: (captureId: string, type: 'tag' | 'domain' | 'context', value: string) => Promise<void>
  onAcceptAll: () => Promise<void>
  loading?: boolean
}

export function AgentTriageStrip({
  captures,
  contexts,
  onAcceptSuggestion,
  onDismissSuggestion,
  onAcceptAll,
  loading,
}: AgentTriageStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Build list of suggestions from captures that have ai_* fields
  const suggestions = captures.flatMap(cap => {
    const items: Array<{
      captureId: string
      type: 'tag' | 'domain' | 'context'
      value: string
      label: string
    }> = []

    if ((cap.ai_tags?.length ?? 0) > 0) {
      items.push(
        ...cap.ai_tags!.map(t => ({
          captureId: cap.id,
          type: 'tag' as const,
          value: t,
          label: `Tag as "${t}"`,
        }))
      )
    }

    if ((cap.ai_domains?.length ?? 0) > 0) {
      items.push(
        ...cap.ai_domains!.map(d => ({
          captureId: cap.id,
          type: 'domain' as const,
          value: d,
          label: `Domain: ${d}`,
        }))
      )
    }

    if ((cap.ai_suggested_contexts?.length ?? 0) > 0) {
      items.push(
        ...cap.ai_suggested_contexts!.map(ctxId => {
          const ctx = contexts.find(c => c.id === ctxId)
          return {
            captureId: cap.id,
            type: 'context' as const,
            value: ctxId,
            label: `Assign to ${ctx?.name ?? 'context'}`,
          }
        })
      )
    }

    return items
  })

  if (suggestions.length === 0) return null

  return (
    <div className="fade-in" style={{ background: 'var(--cream-2)', borderBottom: '1px solid var(--line-soft)' }}>
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {suggestions.map((sug, i) => (
          <div
            key={`${sug.captureId}-${sug.type}-${i}`}
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              background: 'var(--cream)',
              border: '1.5px solid var(--line)',
              borderRadius: 8,
              padding: '8px 10px',
              flexShrink: 0,
              minWidth: 'fit-content',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{sug.label}</span>

            <button
              onClick={() => onAcceptSuggestion(sug.captureId, sug.type, sug.value)}
              disabled={loading}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: 'var(--green)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.5 : 1,
                padding: 0,
              }}
            >
              <Ic.check width={12} height={12} />
            </button>

            <button
              onClick={() => onDismissSuggestion(sug.captureId, sug.type, sug.value)}
              disabled={loading}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: 'var(--red)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.5 : 1,
                padding: 0,
              }}
            >
              <Ic.close width={12} height={12} />
            </button>
          </div>
        ))}

        <button
          onClick={onAcceptAll}
          disabled={loading}
          style={{
            padding: '8px 14px',
            background: 'var(--violet)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 11,
            letterSpacing: '0.04em',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Accept all
        </button>
      </div>
    </div>
  )
}
