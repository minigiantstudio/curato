'use client'

import { useEffect, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { getContexts, updateContextAssignment } from '@/lib/contexts'
import { Ic } from '@/components/icons'
import type { Capture } from '@/types/capture'
import type { Context } from '@/types/context'

interface AssignContextSheetProps {
  open: boolean
  capture: Capture | null
  onClose: () => void
  onSaved?: (captureId: string, contextIds: string[]) => void
}

export function AssignContextSheet({
  open,
  capture,
  onClose,
  onSaved,
}: AssignContextSheetProps) {
  const [contexts, setContexts] = useState<Context[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load contexts once on first open
  useEffect(() => {
    if (open && !loaded) {
      getContexts().then(ctxs => {
        setContexts(ctxs)
        setLoaded(true)
      })
    }
  }, [open, loaded])

  // Sync selected IDs when capture changes
  useEffect(() => {
    if (capture) {
      setSelected([...capture.context_ids])
    }
  }, [capture])

  async function toggle(contextId: string) {
    if (!capture) return
    const next = selected.includes(contextId)
      ? selected.filter(id => id !== contextId)
      : [...selected, contextId]
    setSelected(next)

    setSaving(true)
    const success = await updateContextAssignment(capture.id, next)
    setSaving(false)
    if (success) {
      onSaved?.(capture.id, next)
    }
  }

  const brands = contexts.filter(c => c.type === 'brand')
  const projects = contexts.filter(c => c.type === 'project')

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ padding: '12px 20px 36px' }}>
        {/* Handle bar */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--line)', margin: '0 auto 16px',
        }} />

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{
            fontFamily: 'var(--display)',
            fontSize: 16,
            fontWeight: 400,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}>
            Assign to context
          </p>
          {saving && (
            <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>Saving…</span>
          )}
        </div>

        {/* Capture preview */}
        {capture && (
          <div style={{
            padding: '10px 12px',
            background: 'var(--cream-2)',
            border: '1.5px solid var(--line-soft)',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <p style={{
              fontSize: 11,
              color: 'var(--ink-soft)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {capture.content || `[${capture.type}]`}
            </p>
          </div>
        )}

        {contexts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-faint)', fontSize: 12 }}>
            No contexts yet. Create one first.
          </div>
        )}

        {/* Brands */}
        {brands.length > 0 && (
          <section style={{ marginBottom: 16 }}>
            <p style={{
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
              marginBottom: 8,
            }}>
              Brands
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {brands.map(ctx => (
                <ContextToggleRow
                  key={ctx.id}
                  context={ctx}
                  checked={selected.includes(ctx.id)}
                  onToggle={() => toggle(ctx.id)}
                  disabled={saving}
                />
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section>
            <p style={{
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
              marginBottom: 8,
            }}>
              Projects
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {projects.map(ctx => (
                <ContextToggleRow
                  key={ctx.id}
                  context={ctx}
                  checked={selected.includes(ctx.id)}
                  onToggle={() => toggle(ctx.id)}
                  disabled={saving}
                />
              ))}
            </div>
          </section>
        )}

        {/* Done button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 20,
            padding: '12px',
            background: 'var(--ink)',
            color: 'var(--cream)',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </Sheet>
  )
}

// ── Row sub-component ─────────────────────────────────────────────

interface ContextToggleRowProps {
  context: Context
  checked: boolean
  onToggle: () => void
  disabled: boolean
}

function ContextToggleRow({ context, checked, onToggle, disabled }: ContextToggleRowProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 12px',
        background: checked ? 'rgba(74,61,176,0.07)' : 'var(--cream-2)',
        border: `1.5px solid ${checked ? 'rgba(74,61,176,0.2)' : 'var(--line-soft)'}`,
        borderRadius: 8,
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        opacity: disabled ? 0.7 : 1,
        transition: 'background .15s',
      }}
    >
      {/* Checkbox circle */}
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `1.5px solid ${checked ? 'var(--violet)' : 'var(--line)'}`,
        background: checked ? 'var(--violet)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background .15s',
      }}>
        {checked && <Ic.check width={11} height={11} style={{ color: '#fff' }} />}
      </div>

      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{context.name}</span>
      <span style={{
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: context.type === 'brand' ? 'var(--violet)' : 'var(--ink-faint)',
      }}>
        {context.type}
      </span>
    </button>
  )
}
