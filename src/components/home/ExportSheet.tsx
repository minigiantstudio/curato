'use client'

import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { ExportGuidelinesSheet } from '@/components/dossier/ExportGuidelinesSheet'

interface Props {
  open: boolean
  onClose: () => void
  capsuleId: string | null
  capsuleVersion: number | null
}

const ROWS = [
  { key: 'claude', label: 'Claude', connected: true },
  { key: 'figma',  label: 'Figma',  connected: false },
  { key: 'canva',  label: 'Canva',  connected: false },
] as const

export function ExportSheet({ open, onClose, capsuleId, capsuleVersion }: Props) {
  const [showExport, setShowExport] = useState(false)

  if (showExport && capsuleId) {
    return (
      <ExportGuidelinesSheet
        capsuleId={capsuleId}
        filenameSlug="curato-capsule"
        onClose={() => setShowExport(false)}
      />
    )
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ padding: '20px 20px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
          <span style={{
            fontFamily: 'var(--display)', fontSize: 19, fontWeight: 400,
            color: 'var(--ink)',
          }}>Export capsule</span>
          {capsuleVersion !== null && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)',
              background: 'var(--cream-2)', padding: '2px 6px',
              border: '1px solid var(--line-soft)',
            }}>v{capsuleVersion}</span>
          )}
        </div>
        <p style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--ink-faint)', margin: '0 0 20px',
        }}>
          Your eye, as a machine-readable file. Connected over MCP.
        </p>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {ROWS.map((row, i) => (
            <button
              key={row.key}
              onClick={row.connected && capsuleId ? () => setShowExport(true) : undefined}
              disabled={!row.connected || !capsuleId}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0',
                background: 'none', border: 'none',
                borderBottom: i < ROWS.length - 1 ? '1px solid var(--line-soft)' : 'none',
                cursor: row.connected && capsuleId ? 'pointer' : 'default',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: row.connected ? 'var(--green)' : 'var(--ink-faint)',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)',
                }}>{row.label}</span>
              </div>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                letterSpacing: '0.06em', fontWeight: 600,
                color: row.connected ? 'var(--green)' : 'var(--violet)',
                textDecoration: row.connected ? 'none' : 'underline',
                textTransform: 'uppercase',
              }}>
                {row.connected ? 'connected' : 'connect'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
