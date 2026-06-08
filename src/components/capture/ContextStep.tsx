'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Ic } from '@/components/icons'
import { Tag } from '@/components/ui/Tag'
import { Chip } from '@/components/ui/Chip'
import { DOMAINS, TAG_SUGGESTIONS, PROJECTS, type CaptureType, type Verdict } from '@/types/capture'

export interface ContextData {
  verdict: Verdict | 'pending' | null
  domain: string
  tags: string[]
  projects: string[]
  take: string
}

interface ContextStepProps {
  type: CaptureType
  content: string
  onBack: () => void
  onDone: (data: ContextData) => void
}

export function ContextStep({ type, content, onBack, onDone }: ContextStepProps) {
  const [verdict, setVerdict] = useState<Verdict | 'pending' | null>(null)
  const [domain, setDomain] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [newTag, setNewTag] = useState('')
  const [projects, setProjects] = useState<string[]>([])
  const [take, setTake] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(t: string) {
    const s = t.trim().toLowerCase().replace(/\s+/g, '-')
    if (!s || tags.includes(s)) return
    setTags(prev => [...prev, s])
    setNewTag(s)
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

  function toggleProject(p: string) {
    setProjects(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  // canSave: verdict set, OR rule/feeling (which don't need verdicts)
  const canSave = verdict !== null || type === 'rule' || type === 'feeling'
  const showVerdict = type !== 'rule'

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cream)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line-soft)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', padding: 4 }}>
          <Ic.back width={20} height={20} />
        </button>
        <span className="label">Context</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, letterSpacing: '0.08em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
          {type}
        </span>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>

        {/* Annotation preview */}
        {content && (
          <div style={{ margin: '12px 16px 0', padding: '10px 12px', background: 'var(--cream-2)', borderRadius: 8, border: '1.5px solid var(--line-soft)' }}>
            <p style={{
              fontSize: 12, color: 'var(--ink)', lineHeight: 1.5,
              maxHeight: 60, overflow: 'hidden',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
            }}>
              {content}
            </p>
          </div>
        )}

        {/* Verdict */}
        {showVerdict && (
          <div style={{ padding: '16px 16px 12px' }}>
            <div className="label" style={{ marginBottom: 10 }}>Verdict</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setVerdict(verdict === 'keep' ? null : 'keep')}
                style={{
                  flex: 1, padding: '14px', borderRadius: 10,
                  border: `2px solid ${verdict === 'keep' ? 'var(--green)' : 'var(--line)'}`,
                  background: verdict === 'keep' ? 'var(--green-soft)' : 'var(--cream-2)',
                  color: verdict === 'keep' ? 'var(--green)' : 'var(--ink-soft)',
                  fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all .14s',
                }}
              >
                ✓  KEEP
              </button>
              <button
                onClick={() => setVerdict(verdict === 'reject' ? null : 'reject')}
                style={{
                  flex: 1, padding: '14px', borderRadius: 10,
                  border: `2px solid ${verdict === 'reject' ? 'var(--red)' : 'var(--line)'}`,
                  background: verdict === 'reject' ? 'var(--red-soft)' : 'var(--cream-2)',
                  color: verdict === 'reject' ? 'var(--red)' : 'var(--ink-soft)',
                  fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all .14s',
                }}
              >
                ✗  REJECT
              </button>
              <button
                onClick={() => setVerdict(verdict === 'pending' ? null : 'pending')}
                style={{
                  width: 50, borderRadius: 10,
                  border: `2px solid ${verdict === 'pending' ? 'var(--violet)' : 'var(--line)'}`,
                  background: verdict === 'pending' ? 'rgba(74,61,176,0.10)' : 'var(--cream-2)',
                  color: verdict === 'pending' ? 'var(--violet)' : 'var(--ink-soft)',
                  cursor: 'pointer', fontSize: 14, letterSpacing: '0.04em', transition: 'all .14s',
                }}
              >
                ?
              </button>
            </div>
          </div>
        )}

        {/* Domain */}
        <div style={{ padding: '0 16px 12px' }}>
          <div className="label" style={{ marginBottom: 8 }}>Domain</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DOMAINS.map(d => (
              <Chip key={d} label={d} variant={domain === d ? 'on' : 'off'} onClick={() => setDomain(domain === d ? '' : d)} />
            ))}
          </div>
        </div>

        {/* Tags */}
        <div style={{ padding: '0 16px 12px' }}>
          <div className="label" style={{ marginBottom: 8 }}>Tags</div>

          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {tags.map(tg => (
                <Tag key={tg} label={tg} onRemove={() => removeTag(tg)} isNew={tg === newTag} />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {TAG_SUGGESTIONS.filter(s => !tags.includes(s)).slice(0, 4).map(s => (
              <button
                key={s}
                onClick={() => addTag(s)}
                style={{
                  fontSize: 10, color: 'var(--ink-faint)',
                  border: '1px solid var(--line)', padding: '3px 8px',
                  borderRadius: 10, background: 'var(--cream-2)', cursor: 'pointer',
                }}
              >
                + {s}
              </button>
            ))}
          </div>

          <input
            ref={inputRef}
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Type a tag, press return"
            style={{
              width: '100%', background: 'var(--cream-2)',
              border: '1.5px solid var(--line-soft)', borderRadius: 8,
              color: 'var(--ink)', fontSize: 12, padding: '8px 10px',
            }}
          />
        </div>

        {/* Applies to */}
        <div style={{ padding: '0 16px 12px' }}>
          <div className="label" style={{ marginBottom: 8 }}>Applies to</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PROJECTS.map(p => (
              <Chip
                key={p}
                label={p}
                variant={projects.includes(p) ? 'on' : 'off'}
                onClick={() => toggleProject(p)}
              />
            ))}
          </div>
        </div>

        {/* Point of view */}
        <div style={{ padding: '0 16px 12px' }}>
          <div className="label" style={{ marginBottom: 8 }}>Point of view</div>
          <textarea
            value={take}
            onChange={e => setTake(e.target.value)}
            rows={2}
            placeholder="Why does this matter to your practice?"
            style={{
              width: '100%', resize: 'none',
              background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)',
              borderRadius: 8, color: 'var(--ink)', fontSize: 12,
              padding: '9px 10px', lineHeight: 1.5,
            }}
          />
        </div>
      </div>

      {/* Save button */}
      <div style={{ padding: '10px 16px 14px', flexShrink: 0 }}>
        <button
          onClick={() => {
            const v = verdict === 'pending' ? null : (verdict as Verdict)
            onDone({ verdict: v, domain, tags, projects, take })
          }}
          style={{
            width: '100%', padding: '15px',
            background: canSave ? 'var(--ink)' : 'var(--panel)',
            borderRadius: 10, border: 'none',
            color: canSave ? 'var(--cream)' : 'var(--ink-faint)',
            fontSize: 13, letterSpacing: '0.04em',
            cursor: canSave ? 'pointer' : 'default',
            fontFamily: 'var(--mono)', transition: 'all .2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Ic.check width={16} height={16} /> Save to capsule
        </button>
      </div>
    </div>
  )
}
