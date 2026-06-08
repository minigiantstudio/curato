'use client'

import { useState, useEffect } from 'react'
import { Ic } from '@/components/icons'
import { getContexts, type Context } from '@/lib/contexts'

interface ContextPickerProps {
  value: string[]
  onChange: (ids: string[]) => void
}

export function ContextPicker({ value, onChange }: ContextPickerProps) {
  const [open, setOpen] = useState(false)
  const [contexts, setContexts] = useState<Context[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open && contexts.length === 0) {
      getContexts().then(setContexts)
    }
  }, [open, contexts.length])

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  }

  const filtered = query
    ? contexts.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : contexts

  return (
    <div>
      {/* Collapsed trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', background: 'var(--cream-2)',
          border: '1.5px solid var(--line-soft)', borderRadius: open ? '8px 8px 0 0' : 8,
          color: 'var(--ink-soft)', fontSize: 12, cursor: 'pointer',
          transition: 'border-radius .15s',
        }}
      >
        <span>
          {value.length > 0
            ? `${value.length} context${value.length > 1 ? 's' : ''} selected`
            : 'Assign to a context…'}
        </span>
        <Ic.chevron
          width={14} height={14}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="fade-in" style={{
          background: 'var(--cream-2)',
          border: '1.5px solid var(--line-soft)', borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          maxHeight: 200, overflowY: 'auto',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line-soft)' }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search contexts…"
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                color: 'var(--ink)', fontSize: 12,
              }}
            />
          </div>

          {/* Context list */}
          {filtered.length === 0 && (
            <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 11 }}>
              {contexts.length === 0 ? 'No contexts yet — create one in Settings' : 'No match'}
            </div>
          )}
          {filtered.map(ctx => (
            <button
              key={ctx.id}
              onClick={() => toggle(ctx.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px',
                background: value.includes(ctx.id) ? 'rgba(74,61,176,0.07)' : 'none',
                border: 'none', borderBottom: '1px solid var(--line-soft)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{
                fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: ctx.type === 'brand' ? 'var(--violet)' : 'var(--ink-faint)',
                width: 40, flexShrink: 0,
              }}>
                {ctx.type}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink)', flex: 1 }}>{ctx.name}</span>
              {value.includes(ctx.id) && (
                <Ic.check width={14} height={14} style={{ color: 'var(--violet)', flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
