'use client'

import { useState } from 'react'
import type { LibraryFilters } from '@/lib/captures'
import type { CaptureType } from '@/types/capture'
import { CAPTURE_TYPES, DOMAINS } from '@/types/capture'
import type { Context } from '@/types/context'

interface FilterBarProps {
  filters: LibraryFilters
  contexts: Context[]
  onChange: (f: LibraryFilters) => void
}

function Chip({
  label,
  active,
  onToggle,
  onDismiss,
}: {
  label: string
  active: boolean
  onToggle: () => void
  onDismiss?: () => void
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 10px',
        borderRadius: '20px',
        border: active ? '1.5px solid var(--ink)' : '1.5px solid var(--dust)',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--cream)' : 'var(--stone)',
        fontFamily: 'var(--mono)',
        fontSize: '11px',
        letterSpacing: '0.06em',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
      {active && onDismiss && (
        <span
          onClick={e => { e.stopPropagation(); onDismiss() }}
          style={{ marginLeft: '2px', opacity: 0.7, fontSize: '13px', lineHeight: 1 }}
        >
          ×
        </span>
      )}
    </button>
  )
}

export function FilterBar({ filters, contexts, onChange }: FilterBarProps) {
  const [expanded, setExpanded] = useState<'type' | 'domain' | 'verdict' | 'context' | 'date' | null>(null)

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.domains.length > 0 ||
    filters.verdict !== null ||
    filters.contextId !== null ||
    filters.hasMedia !== null ||
    filters.dateRange !== null

  function toggleType(t: CaptureType) {
    const next = filters.types.includes(t)
      ? filters.types.filter(x => x !== t)
      : [...filters.types, t]
    onChange({ ...filters, types: next })
  }

  function toggleDomain(d: string) {
    const next = filters.domains.includes(d)
      ? filters.domains.filter(x => x !== d)
      : [...filters.domains, d]
    onChange({ ...filters, domains: next })
  }

  const DATE_OPTIONS: { label: string; value: LibraryFilters['dateRange'] }[] = [
    { label: 'This week', value: 'week' },
    { label: 'This month', value: 'month' },
    { label: 'All time', value: 'all' },
  ]

  const scrollRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    padding: '0 16px 10px',
    scrollbarWidth: 'none',
  }

  return (
    <div style={{ borderBottom: '1px solid var(--dust)' }}>
      {/* Main filter row */}
      <div style={{ ...scrollRowStyle, padding: '10px 16px' }}>
        <Chip
          label={filters.types.length > 0 ? `Type (${filters.types.length})` : 'Type'}
          active={filters.types.length > 0}
          onToggle={() => setExpanded(expanded === 'type' ? null : 'type')}
          onDismiss={filters.types.length > 0 ? () => onChange({ ...filters, types: [] }) : undefined}
        />
        <Chip
          label={filters.domains.length > 0 ? `Domain (${filters.domains.length})` : 'Domain'}
          active={filters.domains.length > 0}
          onToggle={() => setExpanded(expanded === 'domain' ? null : 'domain')}
          onDismiss={filters.domains.length > 0 ? () => onChange({ ...filters, domains: [] }) : undefined}
        />
        <Chip
          label={filters.verdict ? filters.verdict.charAt(0).toUpperCase() + filters.verdict.slice(1) : 'Verdict'}
          active={filters.verdict !== null}
          onToggle={() => setExpanded(expanded === 'verdict' ? null : 'verdict')}
          onDismiss={filters.verdict !== null ? () => onChange({ ...filters, verdict: null }) : undefined}
        />
        {contexts.length > 0 && (
          <Chip
            label={filters.contextId ? (contexts.find(c => c.id === filters.contextId)?.name ?? 'Context') : 'Context'}
            active={filters.contextId !== null}
            onToggle={() => setExpanded(expanded === 'context' ? null : 'context')}
            onDismiss={filters.contextId !== null ? () => onChange({ ...filters, contextId: null }) : undefined}
          />
        )}
        <Chip
          label="Has media"
          active={filters.hasMedia === true}
          onToggle={() => onChange({ ...filters, hasMedia: filters.hasMedia === true ? null : true })}
          onDismiss={filters.hasMedia === true ? () => onChange({ ...filters, hasMedia: null }) : undefined}
        />
        <Chip
          label={filters.dateRange ? DATE_OPTIONS.find(o => o.value === filters.dateRange)?.label ?? 'Date' : 'Date'}
          active={filters.dateRange !== null}
          onToggle={() => setExpanded(expanded === 'date' ? null : 'date')}
          onDismiss={filters.dateRange !== null ? () => onChange({ ...filters, dateRange: null }) : undefined}
        />
        {hasActiveFilters && (
          <button
            onClick={() => onChange({ query: filters.query, types: [], domains: [], verdict: null, contextId: null, hasMedia: null, dateRange: null })}
            style={{
              padding: '5px 10px',
              borderRadius: '20px',
              border: '1.5px solid var(--dust)',
              background: 'transparent',
              color: 'var(--violet)',
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded sub-rows */}
      {expanded === 'type' && (
        <div style={scrollRowStyle}>
          {CAPTURE_TYPES.map(t => (
            <Chip key={t.id} label={t.label} active={filters.types.includes(t.id)} onToggle={() => toggleType(t.id)} />
          ))}
        </div>
      )}
      {expanded === 'domain' && (
        <div style={scrollRowStyle}>
          {DOMAINS.map(d => (
            <Chip key={d} label={d} active={filters.domains.includes(d)} onToggle={() => toggleDomain(d)} />
          ))}
        </div>
      )}
      {expanded === 'verdict' && (
        <div style={{ display: 'flex', gap: '6px', padding: '0 16px 10px' }}>
          {(['keep', 'reject', 'unset'] as const).map(v => (
            <Chip
              key={v}
              label={v.charAt(0).toUpperCase() + v.slice(1)}
              active={filters.verdict === v}
              onToggle={() => onChange({ ...filters, verdict: filters.verdict === v ? null : v })}
            />
          ))}
        </div>
      )}
      {expanded === 'context' && (
        <div style={scrollRowStyle}>
          {contexts.map(c => (
            <Chip
              key={c.id}
              label={c.name}
              active={filters.contextId === c.id}
              onToggle={() => onChange({ ...filters, contextId: filters.contextId === c.id ? null : c.id })}
            />
          ))}
        </div>
      )}
      {expanded === 'date' && (
        <div style={{ display: 'flex', gap: '6px', padding: '0 16px 10px' }}>
          {DATE_OPTIONS.map(o => (
            <Chip
              key={String(o.value)}
              label={o.label}
              active={filters.dateRange === o.value}
              onToggle={() => onChange({ ...filters, dateRange: filters.dateRange === o.value ? null : o.value })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
