'use client'

import { useState, useEffect } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { createContext as createTasteContext } from '@/lib/contexts'
import type { Context } from '@/types/context'

interface CreateContextSheetProps {
  open: boolean
  defaultType: 'brand' | 'project'
  brands: Context[]          // existing brands for parent picker
  onClose: () => void
  onCreated: () => void      // called after successful creation
}

export function CreateContextSheet({
  open,
  defaultType,
  brands,
  onClose,
  onCreated,
}: CreateContextSheetProps) {
  const [type, setType] = useState<'brand' | 'project'>(defaultType)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const [parentQuery, setParentQuery] = useState('')
  const [parentOpen, setParentOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setType(defaultType)
      setName('')
      setDescription('')
      setParentId(null)
      setParentQuery('')
      setParentOpen(false)
      setError('')
    }
  }, [open, defaultType])

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')
    const created = await createTasteContext({
      type,
      name: name.trim(),
      description: description.trim() || undefined,
      parent_context_id: type === 'project' ? parentId : null,
    })
    setSaving(false)
    if (!created) {
      setError('Failed to save. Try again.')
      return
    }
    // Reset form
    setName('')
    setDescription('')
    setParentId(null)
    onCreated()
  }

  const filteredBrands = parentQuery
    ? brands.filter(b => b.name.toLowerCase().includes(parentQuery.toLowerCase()))
    : brands

  const selectedParent = brands.find(b => b.id === parentId)

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ padding: '12px 20px 36px' }}>
        {/* Handle bar */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--line)', margin: '0 auto 20px',
        }} />

        {/* Title */}
        <p style={{
          fontFamily: 'var(--display)',
          fontSize: 18,
          fontWeight: 400,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
          marginBottom: 20,
        }}>
          New context
        </p>

        {/* Type toggle */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            display: 'block',
            marginBottom: 6,
          }}>
            Type
          </label>
          <div style={{
            display: 'flex',
            gap: 0,
            border: '1.5px solid var(--line-soft)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {(['brand', 'project'] as const).map(t => (
              <button
                key={t}
                onClick={() => {
                  setType(t)
                  setParentId(null)
                  setParentQuery('')
                  setParentOpen(false)
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: type === t ? 'var(--ink)' : 'var(--cream-2)',
                  color: type === t ? 'var(--cream)' : 'var(--ink-soft)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'var(--mono)',
                  letterSpacing: '0.04em',
                  textTransform: 'capitalize',
                  transition: 'background .15s, color .15s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Name field */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            display: 'block',
            marginBottom: 6,
          }}>
            Name <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            autoFocus
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder={type === 'brand' ? 'e.g. PLURAL CAFE' : 'e.g. Poster S/S 2026'}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--cream-2)',
              border: `1.5px solid ${error ? 'var(--red)' : 'var(--line-soft)'}`,
              borderRadius: 8,
              color: 'var(--ink)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{error}</p>
          )}
        </div>

        {/* Parent brand picker (projects only) */}
        {type === 'project' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
              display: 'block',
              marginBottom: 6,
            }}>
              Parent brand (optional)
            </label>

            {/* Collapsed trigger */}
            <button
              onClick={() => setParentOpen(o => !o)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--cream-2)',
                border: '1.5px solid var(--line-soft)',
                borderRadius: parentOpen ? '8px 8px 0 0' : 8,
                color: selectedParent ? 'var(--ink)' : 'var(--ink-faint)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'border-radius .15s',
                boxSizing: 'border-box',
              }}
            >
              <span>
                {selectedParent ? (
                  <span style={{ color: 'var(--violet)' }}>● </span>
                ) : null}
                {selectedParent?.name ?? 'Select a brand…'}
              </span>
              <span style={{
                transform: parentOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform .2s',
                display: 'inline-block',
                fontSize: 10,
                color: 'var(--ink-faint)',
              }}>
                ▾
              </span>
            </button>

            {parentOpen && (
              <div style={{
                background: 'var(--cream-2)',
                border: '1.5px solid var(--line-soft)',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                maxHeight: 180,
                overflowY: 'auto',
              }}>
                {/* Search */}
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line-soft)' }}>
                  <input
                    value={parentQuery}
                    onChange={e => setParentQuery(e.target.value)}
                    placeholder="Search brands…"
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--ink)',
                      fontSize: 12,
                    }}
                  />
                </div>

                {/* None option */}
                <button
                  onClick={() => { setParentId(null); setParentOpen(false) }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    background: parentId === null ? 'rgba(74,61,176,0.07)' : 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--line-soft)',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--ink-faint)',
                  }}
                >
                  No parent brand
                </button>

                {brands.length === 0 && (
                  <div style={{ padding: '12px', color: 'var(--ink-faint)', fontSize: 11, textAlign: 'center' }}>
                    No brands yet
                  </div>
                )}

                {filteredBrands.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setParentId(b.id); setParentOpen(false) }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      background: parentId === b.id ? 'rgba(74,61,176,0.07)' : 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--line-soft)',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{b.name}</span>
                    {parentId === b.id && (
                      <span style={{ fontSize: 10, color: 'var(--violet)' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Description field */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            display: 'block',
            marginBottom: 6,
          }}>
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the aesthetic scope of this context…"
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--cream-2)',
              border: '1.5px solid var(--line-soft)',
              borderRadius: 8,
              color: 'var(--ink)',
              fontSize: 13,
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          style={{
            width: '100%',
            padding: '14px',
            background: saving || !name.trim() ? 'var(--line)' : 'var(--ink)',
            color: saving || !name.trim() ? 'var(--ink-faint)' : 'var(--cream)',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            letterSpacing: '0.04em',
            cursor: saving || !name.trim() ? 'default' : 'pointer',
            transition: 'background .15s',
          }}
        >
          {saving ? 'Saving…' : 'Create context'}
        </button>
      </div>
    </Sheet>
  )
}
