'use client'

import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Ic } from '@/components/icons'
import { deleteCapture, updateCapture } from '@/lib/captures'
import type { Capture } from '@/types/capture'
import type { Context } from '@/types/context'

interface CaptureDetailProps {
  capture: Capture | null
  contexts: Context[]
  open: boolean
  onClose: () => void
  onDeleted: (captureId: string) => void
  onUpdated: (capture: Capture) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function TagPill({ label }: { label: string }) {
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '12px',
      border: '1px solid var(--dust)',
      fontFamily: 'var(--mono)',
      fontSize: '11px',
      color: 'var(--stone)',
    }}>
      {label}
    </span>
  )
}

export function CaptureDetail({
  capture,
  contexts,
  open,
  onClose,
  onDeleted,
  onUpdated,
}: CaptureDetailProps) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!capture) return null

  const assignedContexts = contexts.filter(c => capture.context_ids.includes(c.id))
  const allTags = Array.from(new Set([...capture.tags, ...capture.ai_tags]))
  const allDomains = Array.from(new Set([...capture.domains, ...capture.ai_domains]))

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const ok = await deleteCapture(capture!.id)
    setDeleting(false)
    if (ok) {
      onDeleted(capture!.id)
      onClose()
    }
  }

  async function handleVerdictToggle(v: 'keep' | 'reject') {
    const next = capture!.verdict === v ? null : v
    const ok = await updateCapture(capture!.id, { verdict: next })
    if (ok) onUpdated({ ...capture!, verdict: next })
  }

  async function handleShare() {
    const lines: string[] = [
      `[${capture!.type.toUpperCase()}] ${formatDate(capture!.created_at)}`,
      capture!.content,
    ]
    if (allTags.length) lines.push(`Tags: ${allTags.join(', ')}`)
    if (allDomains.length) lines.push(`Domains: ${allDomains.join(', ')}`)
    if (capture!.verdict) lines.push(`Verdict: ${capture!.verdict}`)
    if (assignedContexts.length) lines.push(`Contexts: ${assignedContexts.map(c => c.name).join(', ')}`)

    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <Sheet open={open} onClose={() => { setConfirmDelete(false); onClose() }}>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '85vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              color: 'var(--stone)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {capture.type}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--stone)' }}>
              {formatDate(capture.created_at)}
            </span>
          </div>
          <button
            onClick={() => { setConfirmDelete(false); onClose() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <Ic.close width={18} height={18} />
          </button>
        </div>

        {/* Media */}
        {capture.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capture.media_url}
            alt={capture.content || capture.type}
            style={{ width: '100%', borderRadius: '8px', objectFit: 'cover', maxHeight: '300px' }}
          />
        )}

        {/* Content */}
        {capture.content && (
          <p style={{ margin: 0, fontFamily: 'var(--display)', fontSize: '18px', lineHeight: 1.5, color: 'var(--ink)' }}>
            {capture.content}
          </p>
        )}

        {/* Rule verb */}
        {capture.rule_verb && (
          <div style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '4px',
            background: 'var(--ink)',
            color: 'var(--cream)',
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            letterSpacing: '0.1em',
            alignSelf: 'flex-start',
          }}>
            {capture.rule_verb}
          </div>
        )}

        {/* Verdict toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleVerdictToggle('keep')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: capture.verdict === 'keep' ? '2px solid #4CAF50' : '1.5px solid var(--dust)',
              background: capture.verdict === 'keep' ? '#4CAF50' : 'transparent',
              color: capture.verdict === 'keep' ? '#fff' : 'var(--stone)',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ✓ Keep
          </button>
          <button
            onClick={() => handleVerdictToggle('reject')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: capture.verdict === 'reject' ? '2px solid #F44336' : '1.5px solid var(--dust)',
              background: capture.verdict === 'reject' ? '#F44336' : 'transparent',
              color: capture.verdict === 'reject' ? '#fff' : 'var(--stone)',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ✕ Reject
          </button>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div>
            <p style={{ margin: '0 0 6px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tags</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {allTags.map(t => <TagPill key={t} label={t} />)}
            </div>
          </div>
        )}

        {/* Domains */}
        {allDomains.length > 0 && (
          <div>
            <p style={{ margin: '0 0 6px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Domains</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {allDomains.map(d => <TagPill key={d} label={d} />)}
            </div>
          </div>
        )}

        {/* Assigned contexts */}
        {assignedContexts.length > 0 && (
          <div>
            <p style={{ margin: '0 0 6px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contexts</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {assignedContexts.map(c => <TagPill key={c.id} label={c.name} />)}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: '1.5px solid var(--dust)',
              background: 'transparent',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              cursor: 'pointer',
              color: 'var(--stone)',
            }}
          >
            {copied ? '✓ Copied' : 'Share'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: confirmDelete ? '1.5px solid #F44336' : '1.5px solid var(--dust)',
              background: confirmDelete ? '#F44336' : 'transparent',
              color: confirmDelete ? '#fff' : '#F44336',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete' : 'Delete'}
          </button>
        </div>

        {confirmDelete && (
          <button
            onClick={() => setConfirmDelete(false)}
            style={{
              padding: '8px',
              background: 'none',
              border: 'none',
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              color: 'var(--stone)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </Sheet>
  )
}
