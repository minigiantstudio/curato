'use client'

import { useState, useRef } from 'react'
import { CAPTURE_TYPES, type CaptureType } from '@/types/capture'
import type { Capture } from '@/types/capture'
import type { Context } from '@/lib/contexts'
import { Ic } from '@/components/icons'

const TYPE_ICONS: Record<CaptureType, React.FC<{ width?: number; height?: number; style?: React.CSSProperties }>> = {
  photo: Ic.photo,
  voice: Ic.voice,
  note: Ic.note,
  collection: Ic.collection,
  rule: Ic.rule,
  feeling: Ic.feeling,
  reaction: Ic.reaction,
}

interface FeedCardProps {
  capture: Capture
  contexts?: Context[]
  onEditContext?: (captureId: string) => void
  onLongPress?: (capture: Capture) => void
}

function formatTime(date: string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
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

export function FeedCard({ capture, contexts = [], onEditContext, onLongPress }: FeedCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [pressing, setPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)

  function cancelTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setPressing(false)
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!onLongPress) return
    startPosRef.current = { x: e.clientX, y: e.clientY }
    setPressing(true)
    timerRef.current = setTimeout(() => {
      setPressing(false)
      onLongPress(capture)
    }, 600)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!startPosRef.current || !timerRef.current) return
    const dx = Math.abs(e.clientX - startPosRef.current.x)
    const dy = Math.abs(e.clientY - startPosRef.current.y)
    if (dx > 10 || dy > 10) cancelTimer()
  }

  function handlePointerUp() {
    cancelTimer()
  }

  function handleClick() {
    setExpanded(e => !e)
  }
  const typeInfo = CAPTURE_TYPES.find(t => t.id === capture.type)
  const verdictColor =
    capture.verdict === 'keep' ? 'var(--green)' : capture.verdict === 'reject' ? 'var(--red)' : null

  const assignedContexts = contexts.filter(c => capture.context_ids.includes(c.id))

  return (
    <div
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        background: expanded ? 'var(--cream-2)' : 'var(--cream)',
        borderRadius: 12,
        border: `1.5px solid ${pressing ? 'var(--violet)' : expanded ? 'var(--line)' : 'var(--line-soft)'}`,
        padding: '14px',
        cursor: 'pointer',
        transition: 'all .2s',
        userSelect: 'none',
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
          {capture.type in TYPE_ICONS && (
            (() => {
              const Icon = TYPE_ICONS[capture.type as CaptureType]
              return <Icon width={16} height={16} style={{ color: 'var(--ink)' }} />
            })()
          )}
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

      {pressing && onLongPress && (
        <div style={{
          marginTop: 8,
          padding: '6px 10px',
          background: 'rgba(74,61,176,0.07)',
          border: '1px solid rgba(74,61,176,0.15)',
          borderRadius: 6,
          textAlign: 'center',
          fontSize: 10,
          color: 'var(--violet)',
        }}>
          Hold to assign context…
        </div>
      )}
    </div>
  )
}
