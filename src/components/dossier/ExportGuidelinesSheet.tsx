'use client'

import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'

type Fmt = 'markdown' | 'text' | 'json'

const ROWS: { fmt: Fmt; label: string; sub: string }[] = [
  { fmt: 'markdown', label: 'Markdown (.md)', sub: 'Human + agent readable' },
  { fmt: 'text', label: 'Plain text (.txt)', sub: 'Copy-paste anywhere' },
  { fmt: 'json', label: 'JSON (.json)', sub: 'Machine readable · Open Capsule Spec' },
]
const EXT: Record<Fmt, string> = { markdown: 'md', text: 'txt', json: 'json' }

interface Props {
  capsuleId: string
  filenameSlug: string
  onClose: () => void
}

export function ExportGuidelinesSheet({ capsuleId, filenameSlug, onClose }: Props) {
  const [loadingFmt, setLoadingFmt] = useState<Fmt | null>(null)
  const [error, setError] = useState(false)

  async function download(fmt: Fmt) {
    setLoadingFmt(fmt)
    setError(false)
    try {
      const res = await fetch(
        `/api/guidelines/${capsuleId}?format=${fmt}&filename=${encodeURIComponent(filenameSlug)}`,
      )
      if (!res.ok) throw new Error('export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filenameSlug}-guidelines.${EXT[fmt]}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      onClose()
    } catch {
      setError(true)
    } finally {
      setLoadingFmt(null)
    }
  }

  return (
    <Sheet open onClose={onClose}>
      <div style={{ padding: '20px 20px 28px' }}>
        <div className="label" style={{ marginBottom: 4 }}>Export guidelines</div>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 16 }}>
          Download this capsule&apos;s AI guidelines.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ROWS.map(r => (
            <button
              key={r.fmt}
              onClick={() => download(r.fmt)}
              disabled={loadingFmt !== null}
              style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 10,
                border: '1.5px solid var(--line-soft)', background: 'var(--cream-2)',
                cursor: loadingFmt ? 'default' : 'pointer',
                opacity: loadingFmt && loadingFmt !== r.fmt ? 0.5 : 1,
              }}
            >
              <div style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
                {loadingFmt === r.fmt ? 'Preparing…' : r.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{r.sub}</div>
            </button>
          ))}
        </div>
        {error && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 12 }}>
            Export failed — try again.
          </p>
        )}
      </div>
    </Sheet>
  )
}
