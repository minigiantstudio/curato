'use client'

import { useState, useEffect, useRef } from 'react'
import { Ic } from '@/components/icons'

const STORAGE_KEY = 'taste_recent_searches'
const MAX_RECENT = 5

function getRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function saveRecent(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return
  const prev = getRecent().filter(q => q !== query)
  const next = [query, ...prev].slice(0, MAX_RECENT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

interface SearchBarProps {
  value: string
  onSearch: (query: string) => void
  placeholder?: string
}

export function SearchBar({ value, onSearch, placeholder = 'Search captures…' }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const [focused, setFocused] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync when external value changes (e.g. "Clear all" resets query to '')
  useEffect(() => { setLocalValue(value) }, [value])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setLocalValue(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearch(q)
      if (q.trim()) saveRecent(q.trim())
    }, 300)
  }

  function handleFocus() {
    setFocused(true)
    setRecent(getRecent())
  }

  function handleBlur() {
    setTimeout(() => setFocused(false), 150)
  }

  function handleClear() {
    setLocalValue('')
    onSearch('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  function handleRecentClick(q: string) {
    setLocalValue(q)
    onSearch(q)
    saveRecent(q)
    setFocused(false)
  }

  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--dust)' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--paper)',
        borderRadius: '8px',
        padding: '8px 12px',
        border: focused ? '1.5px solid var(--ink)' : '1.5px solid var(--dust)',
      }}>
        <Ic.search width={16} height={16} style={{ flexShrink: 0, opacity: 0.5 }} />
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--mono)',
            fontSize: '13px',
            color: 'var(--ink)',
          }}
        />
        {localValue && (
          <button
            onClick={handleClear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.5 }}
          >
            <Ic.close width={14} height={14} />
          </button>
        )}
      </div>

      {focused && !localValue && recent.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--stone)', alignSelf: 'center' }}>
            Recent:
          </span>
          {recent.map(q => (
            <button
              key={q}
              onMouseDown={() => handleRecentClick(q)}
              style={{
                padding: '3px 8px',
                borderRadius: '12px',
                border: '1px solid var(--dust)',
                background: 'transparent',
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                color: 'var(--stone)',
                cursor: 'pointer',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
