'use client'

import { useState } from 'react'
import { CAPTURE_TYPES } from '@/types/capture'
import type { Capture } from '@/types/capture'
import type { Context } from '@/lib/contexts'

interface FeedCardProps {
  capture: Capture
  contexts?: Context[]
  onEditContext?: (captureId: string) => void
}

function formatTime(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function FeedCard({ capture, contexts = [], onEditContext }: FeedCardProps) {
  const [expanded, setExpanded] = useState(false)
  const typeInfo = CAPTURE_TYPES.find(t => t.id === capture.type)
  const verdictColor =
    capture.verdict === 'keep' ? 'var(--green)' : capture.verdict === 'reject' ? 'var(--red)' : null

  const assignedContexts = contexts.filter(c => capture.context_ids.includes(c.id))

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: expanded ? 'var(--cream-2)' : 'var(--cream)',
        borderRadius: 12,
        border: `1.5px solid ${expanded ? 'var(--line)' : 'var(--line-soft)'}`,
        padding: '14px',
        cursor: 'pointer',
        transition: 'all .2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {/* Type tile */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 6,
            background: typeInfo?.bg ?? 'var(--panel)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, opacity: 0.8 }}>{typeInfo?.label.charAt(0)}</span>
        </div>

        {/* Label + verdict + time */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              {typeInfo?.label}
            </span>
            {capture.verdict && (
              <span style={{ fontSize: 9, color: verdictColor ?? undefined, fontWeight: 500 }}>
                {capture.verdict === 'keep' ? '✓' : '✗'}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--ink-faint)' }}>
              {formatTime(capture.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Content preview (single line, collapsed) */}
      {capture.content && !expanded && (
        <p
          style={{
            fontSize: 12,
            color: 'var(--ink)',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 8,
          }}
        >
          {capture.content}
        </p>
      )}

      {/* Expanded content (multi-line) */}
      {capture.content && expanded && (
        <p
          style={{
            fontSize: 12,
            color: 'var(--ink)',
            lineHeight: 1.5,
            marginBottom: 10,
            maxHeight: 100,
            overflow: 'auto',
          }}
        >
          {capture.content}
        </p>
      )}

      {/* Tags */}
      {capture.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: expanded ? 10 : 6 }}>
          {capture.tags.map(t => (
            <span
              key={t}
              style={{
                fontSize: 9,
                color: 'var(--violet)',
                border: '1px solid var(--violet)',
                padding: '2px 6px',
                borderRadius: 6,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Domains (only when expanded) */}
      {capture.domains.length > 0 && expanded && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {capture.domains.map(d => (
            <span
              key={d}
              style={{
                fontSize: 9,
                color: 'var(--ink-soft)',
                background: 'var(--panel)',
                padding: '2px 6px',
                borderRadius: 6,
              }}
            >
              {d}
            </span>
          ))}
        </div>
      )}

      {/* Context badges */}
      {assignedContexts.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: expanded && onEditContext ? 10 : 0 }}>
          {assignedContexts.map(ctx => (
            <span
              key={ctx.id}
              style={{
                fontSize: 9,
                color: ctx.type === 'brand' ? 'var(--violet)' : 'var(--ink-faint)',
                background: ctx.type === 'brand' ? 'rgba(74,61,176,0.07)' : 'var(--panel)',
                border: `1px solid ${ctx.type === 'brand' ? 'var(--violet)' : 'var(--line-soft)'}`,
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              {ctx.name}
            </span>
          ))}
        </div>
      )}

      {/* Edit button (only when expanded) */}
      {expanded && onEditContext && (
        <button
          onClick={e => {
            e.stopPropagation()
            onEditContext(capture.id)
          }}
          style={{
            width: '100%',
            padding: '10px',
            background: 'var(--violet)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 11,
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          Edit context
        </button>
      )}
    </div>
  )
}
