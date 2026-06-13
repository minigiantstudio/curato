'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getContexts, getCaptureCounts } from '@/lib/contexts'
import { CreateContextSheet } from '@/components/contexts/CreateContextSheet'
import type { Context } from '@/types/context'
import { Ic } from '@/components/icons'
import { useFocus } from '@/components/focus'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ContextsPage() {
  const router = useRouter()
  const { enterFocus } = useFocus()
  const [contexts, setContexts] = useState<Context[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<'brand' | 'project'>('brand')

  const load = useCallback(async () => {
    try {
      const ctxs = await getContexts()
      setContexts(ctxs)
      const c = await getCaptureCounts(ctxs.map(c => c.id))
      setCounts(c)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const brands = contexts.filter(c => c.type === 'brand')
  const projects = contexts.filter(c => c.type === 'project')

  function openCreate(type: 'brand' | 'project') {
    setDefaultType(type)
    setSheetOpen(true)
  }

  async function handleCreated() {
    setSheetOpen(false)
    setLoading(true)
    await load()
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '1px solid var(--line-soft)',
        background: 'rgba(243,236,221,0.96)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}>
        <span style={{
          fontFamily: 'var(--display)',
          fontSize: 20,
          fontWeight: 400,
          letterSpacing: '-0.015em',
          color: 'var(--ink)',
        }}>
          Contexts
        </span>
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4, letterSpacing: '0.02em' }}>
          Brands and projects for your captures
        </p>
      </div>

      <div style={{ padding: '16px 20px 100px' }}>
        {loading && (
          <div style={{ textAlign: 'center', paddingTop: 48, color: 'var(--ink-faint)', fontSize: 12 }}>
            Loading…
          </div>
        )}

        {/* Brands section */}
        {!loading && (
          <section style={{ marginBottom: 28 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <span style={{
                fontSize: 9,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
              }}>
                Brands
              </span>
              <button
                onClick={() => openCreate('brand')}
                style={{
                  fontSize: 10,
                  color: 'var(--violet)',
                  background: 'none',
                  border: '1px solid var(--violet)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                + New Brand
              </button>
            </div>

            {brands.length === 0 && (
              <div style={{
                padding: '24px 16px',
                border: '1.5px dashed var(--line)',
                borderRadius: 10,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', fontFamily: 'var(--display)' }}>
                  No brands yet
                </p>
                <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>
                  Create a brand to group captures by client or studio
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {brands.map(ctx => (
                <ContextCard
                  key={ctx.id}
                  context={ctx}
                  captureCount={counts[ctx.id] ?? 0}
                  parentName={null}
                  onClick={() => router.push(`/contexts/${ctx.id}`)}
                  onEnterFocus={() => { enterFocus(ctx); router.push('/feed') }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Projects section */}
        {!loading && (
          <section>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <span style={{
                fontSize: 9,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
              }}>
                Projects
              </span>
              <button
                onClick={() => openCreate('project')}
                style={{
                  fontSize: 10,
                  color: 'var(--ink-soft)',
                  background: 'none',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                + New Project
              </button>
            </div>

            {projects.length === 0 && (
              <div style={{
                padding: '24px 16px',
                border: '1.5px dashed var(--line)',
                borderRadius: 10,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', fontFamily: 'var(--display)' }}>
                  No projects yet
                </p>
                <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>
                  Projects inherit rules from their parent brand
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map(ctx => {
                const parentBrand = brands.find(b => b.id === ctx.parent_context_id) ?? null
                return (
                  <ContextCard
                    key={ctx.id}
                    context={ctx}
                    captureCount={counts[ctx.id] ?? 0}
                    parentName={parentBrand?.name ?? null}
                    onClick={() => router.push(`/contexts/${ctx.id}`)}
                  />
                )
              })}
            </div>
          </section>
        )}
      </div>

      <CreateContextSheet
        open={sheetOpen}
        defaultType={defaultType}
        brands={brands}
        onClose={() => setSheetOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}

// ── ContextCard sub-component ────────────────────────────────────

interface ContextCardProps {
  context: Context
  captureCount: number
  parentName: string | null
  onClick: () => void
  onEnterFocus?: () => void
}

function ContextCard({ context, captureCount, parentName, onClick, onEnterFocus }: ContextCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--cream)',
        border: '1.5px solid var(--line-soft)',
        borderRadius: 10,
        padding: '14px',
        cursor: 'pointer',
        transition: 'border-color .15s',
      }}
    >
      {/* Top row: name + type badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{
          fontSize: 14,
          fontFamily: 'var(--display)',
          fontWeight: 400,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
        }}>
          {context.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 9,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: context.type === 'brand' ? 'var(--violet)' : 'var(--ink-faint)',
            background: context.type === 'brand' ? 'rgba(74,61,176,0.07)' : 'var(--panel)',
            padding: '2px 7px',
            borderRadius: 4,
            border: `1px solid ${context.type === 'brand' ? 'var(--violet)' : 'var(--line-soft)'}`,
          }}>
            {context.type}
          </span>
          {onEnterFocus && (
            <button
              type="button"
              aria-label={`Focus on ${context.name}`}
              onClick={e => { e.stopPropagation(); onEnterFocus() }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid var(--violet)',
                background: 'rgba(74,61,176,0.07)',
                color: 'var(--violet)',
                cursor: 'pointer',
              }}
            >
              <Ic.focus width={16} height={16} />
            </button>
          )}
        </div>
      </div>

      {/* Parent brand (projects only) */}
      {parentName && (
        <p style={{ fontSize: 10, color: 'var(--violet)', marginBottom: 4, letterSpacing: '0.02em' }}>
          ↳ {parentName}
        </p>
      )}

      {/* Description */}
      {context.description && (
        <p style={{
          fontSize: 11,
          color: 'var(--ink-soft)',
          marginBottom: 8,
          lineHeight: 1.4,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}>
          {context.description}
        </p>
      )}

      {/* Footer: capture count + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
          {captureCount} {captureCount === 1 ? 'capture' : 'captures'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
          Created {formatDate(context.created_at)}
        </span>
      </div>
    </div>
  )
}
