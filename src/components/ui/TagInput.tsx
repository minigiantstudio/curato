'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Tag } from './Tag'
import { getExistingTags } from '@/lib/captures'
import { TAG_SUGGESTIONS } from '@/types/capture'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ value, onChange, placeholder = 'Add a tag…' }: TagInputProps) {
  const [input, setInput] = useState('')
  const [newTag, setNewTag] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([...TAG_SUGGESTIONS])
  const inputRef = useRef<HTMLInputElement>(null)

  // Load existing tags from Supabase on mount
  useEffect(() => {
    getExistingTags().then(existing => {
      const merged = Array.from(new Set([...TAG_SUGGESTIONS, ...existing])).sort()
      setAllTags(merged)
    })
  }, [])

  // Filter suggestions on input change
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([])
      return
    }
    const q = input.toLowerCase()
    setSuggestions(
      allTags.filter(t => t.includes(q) && !value.includes(t)).slice(0, 5)
    )
  }, [input, allTags, value])

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || value.includes(t)) return
    onChange([...value, t])
    setNewTag(t)
    setInput('')
    setSuggestions([])
  }

  function removeTag(t: string) {
    onChange(value.filter(x => x !== t))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && value.length) {
      removeTag(value[value.length - 1])
    }
    if (e.key === 'Escape') setSuggestions([])
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Tag pill container + input */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
          minHeight: 40, background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)',
          borderRadius: 8, padding: '6px 10px', cursor: 'text',
        }}
      >
        {value.map(t => (
          <Tag key={t} label={t} onRemove={() => removeTag(t)} isNew={t === newTag} />
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length ? '' : placeholder}
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--ink)', fontSize: 13, minWidth: 80, flex: 1,
          }}
        />
      </div>

      {/* Suggestion dropdown */}
      {suggestions.length > 0 && (
        <div className="fade-in" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          background: 'var(--cream)', border: '1.5px solid var(--line)',
          borderRadius: 8, marginTop: 4,
          boxShadow: '0 4px 16px rgba(20,18,16,0.12)',
          overflow: 'hidden',
        }}>
          {suggestions.map(s => (
            <button
              key={s}
              onMouseDown={e => { e.preventDefault(); addTag(s) }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px',
                background: 'none', border: 'none', color: 'var(--ink)',
                fontSize: 12, cursor: 'pointer', display: 'block',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
