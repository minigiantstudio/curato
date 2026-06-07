'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Ic } from '@/components/icons'
import { Tag } from '@/components/ui/Tag'
import { Chip } from '@/components/ui/Chip'
import { DOMAINS, TAG_SUGGESTIONS, type CaptureType, type Verdict } from '@/types/capture'

export interface ContextData {
  verdict: Verdict
  domain: string
  tags: string[]
  contextNote: string
}

interface ContextStepProps {
  type: CaptureType
  onBack: () => void
  onDone: (data: ContextData) => void
}

export function ContextStep({ type, onBack, onDone }: ContextStepProps) {
  const [verdict, setVerdict] = useState<Verdict>(null)
  const [domain, setDomain] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [newTag, setNewTag] = useState('')  // tracks the most recently added tag for animation
  const [contextNote, setContextNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Add a tag (from suggestion chip or custom input)
  function addTag(t: string) {
    const normalized = t.trim().toLowerCase().replace(/\s+/g, '-')
    if (!normalized || tags.includes(normalized)) return
    setTags(prev => [...prev, normalized])
    setNewTag(normalized)
    setTagInput('')
  }

  function removeTag(t: string) {
    setTags(prev => prev.filter(x => x !== t))
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      addTag(tagInput)
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  const showVerdict = type !== 'rule'   // rule captures don't take a verdict
  const showDomain  = type !== 'reaction' // reaction has its own verdict UI

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cream)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line-soft)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', padding: 4 }}>
          <Ic.back width={20} height={20} />
        </button>
        <span className="label">Add context</span>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Verdict — keep / reject (not shown for rule) */}
        {showVerdict && (
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Verdict <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 9, color: 'var(--ink-faint)' }}>(optional)</span></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setVerdict(verdict === 'keep' ? null : 'keep')}
                style={{
                  flex: 1, padding: '12px 0',
                  background: verdict === 'keep' ? 'var(--green-soft)' : 'var(--panel)',
                  border: `2px solid ${verdict === 'keep' ? 'var(--green)' : 'var(--line)'}`,
                  borderRadius: 8,
                  color: verdict === 'keep' ? 'var(--green)' : 'var(--ink-soft)',
                  fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                ✓ KEEP
              </button>
              <button
                onClick={() => setVerdict(verdict === 'reject' ? null : 'reject')}
                style={{
                  flex: 1, padding: '12px 0',
                  background: verdict === 'reject' ? 'var(--red-soft)' : 'var(--panel)',
                  border: `2px solid ${verdict === 'reject' ? 'var(--red)' : 'var(--line)'}`,
                  borderRadius: 8,
                  color: verdict === 'reject' ? 'var(--red)' : 'var(--ink-soft)',
                  fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                ✗ REJECT
              </button>
            </div>
          </div>
        )}

        {/* Domain */}
        {showDomain && (
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Domain <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 9, color: 'var(--ink-faint)' }}>(optional)</span></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DOMAINS.map(d => (
                <Chip key={d} label={d} variant={domain === d ? 'on' : 'off'} onClick={() => setDomain(domain === d ? '' : d)} />
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div>
          <div className="label" style={{ marginBottom: 10 }}>Tags <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 9, color: 'var(--ink-faint)' }}>(optional)</span></div>

          {/* Suggestion chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {TAG_SUGGESTIONS.map(s => (
              <Chip
                key={s}
                label={s}
                variant={tags.includes(s) ? 'on' : 'off'}
                onClick={() => tags.includes(s) ? removeTag(s) : addTag(s)}
              />
            ))}
          </div>

          {/* Tag pills + input */}
          <div
            onClick={() => inputRef.current?.focus()}
            style={{
              display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
              minHeight: 40, background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)',
              borderRadius: 8, padding: '6px 10px', cursor: 'text',
            }}
          >
            {tags.map(t => (
              <Tag key={t} label={t} onRemove={() => removeTag(t)} isNew={t === newTag} />
            ))}
            <input
              ref={inputRef}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length ? '' : 'Add a tag…'}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--ink)', fontSize: 13, minWidth: 80, flex: 1,
              }}
            />
          </div>
        </div>

        {/* Context note */}
        <div>
          <div className="label" style={{ marginBottom: 10 }}>Note <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 9, color: 'var(--ink-faint)' }}>(optional)</span></div>
          <textarea
            value={contextNote}
            onChange={e => setContextNote(e.target.value)}
            placeholder="Why does this matter? What's the principle?"
            rows={3}
            style={{
              width: '100%', resize: 'none',
              background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)',
              borderRadius: 8, color: 'var(--ink)', fontSize: 13,
              padding: '10px 12px', lineHeight: 1.55,
            }}
          />
        </div>
      </div>

      {/* Save button */}
      <div style={{ padding: '10px 16px 14px', flexShrink: 0 }}>
        <button
          onClick={() => onDone({ verdict, domain, tags, contextNote })}
          style={{
            width: '100%', padding: '15px',
            background: 'var(--violet)',
            borderRadius: 10, border: 'none',
            color: '#fff', fontSize: 13, letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          Save capture →
        </button>
      </div>
    </div>
  )
}
