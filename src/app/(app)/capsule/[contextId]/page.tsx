'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ic } from '@/components/icons'
import { getContextById } from '@/lib/contexts'
import { getCapsule, getCapsuleHistory, diffCapsules } from '@/lib/capsule'
import type { Context } from '@/types/context'
import type { Capsule, DistilledRule, CapsuleDiffResult } from '@/types/capsule'

interface PageProps {
  params: { contextId: string }
}

export default function CapsuleScreen({ params }: PageProps) {
  const router = useRouter()
  const { contextId } = params

  const [context, setContext] = useState<Context | null>(null)
  const [capsule, setCapsule] = useState<Capsule | null>(null)
  const [history, setHistory] = useState<Capsule[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [ctx, cap, hist] = await Promise.all([
          getContextById(contextId),
          getCapsule(contextId),
          getCapsuleHistory(contextId),
        ])
        setContext(ctx)
        setCapsule(cap)
        setHistory(hist)
      } catch (err) {
        console.error('CapsuleScreen load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [contextId])

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/capsule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextId }),
      })
      const json = await res.json() as { capsule?: Capsule; error?: string }
      if (!res.ok || !json.capsule) throw new Error(json.error ?? 'Generation failed')
      setCapsule(json.capsule)
      setHistory(prev => [json.capsule!, ...prev])
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--cream)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12, fontFamily: 'var(--mono)' }}>Loading…</span>
      </div>
    )
  }

  if (!context) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--cream)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>Context not found</span>
      </div>
    )
  }

  const compareTarget = history.find(h => h.id === selectedHistoryId) ?? null
  const diff: CapsuleDiffResult | null =
    showDiff && capsule && compareTarget && selectedHistoryId !== capsule.id
      ? diffCapsules(compareTarget, capsule)
      : null

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cream)' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 20px 0',
        background: 'rgba(243,236,221,0.96)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
        borderBottom: '1px solid var(--line-soft)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
          >
            <Ic.back width={22} height={22} style={{ color: 'var(--ink)' }} />
          </button>
          <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
            Capsule
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            {context.name}
          </h1>
          {capsule && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--violet)',
              background: 'rgba(74,61,176,0.07)', padding: '2px 8px',
              borderRadius: 4, border: '1px solid rgba(74,61,176,0.2)',
            }}>
              {capsule.version}
            </span>
          )}
        </div>

        {capsule && (
          <div style={{ display: 'flex', gap: 20, paddingBottom: 12 }}>
            {[
              { value: capsule.rules.length, label: 'rules' },
              { value: Object.keys(capsule.frequency_map ?? {}).length, label: 'words' },
              { value: history.length, label: 'versions' },
            ].map(({ value, label }) => (
              <span key={label} style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
                <strong style={{ color: 'var(--ink)', fontFamily: 'var(--display)', fontSize: 13 }}>{value}</strong>{' '}{label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '24px 20px 100px' }}>

        {/* Declaration card */}
        <div style={{
          marginBottom: 20,
          padding: '24px',
          background: 'var(--cream-2)',
          borderRadius: 12,
          border: '1.5px solid var(--line)',
          position: 'relative',
          minHeight: 120,
        }}>
          {generating && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: 'rgba(243,236,221,0.75)', backdropFilter: 'blur(2px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2,
            }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--violet)',
                    animation: `wave-a 1.2s ease-in-out ${i * 0.2}s infinite`,
                    transformOrigin: 'center',
                  }} />
                ))}
              </div>
            </div>
          )}

          {capsule ? (
            <>
              <p style={{
                fontFamily: 'var(--display)', fontSize: 19, lineHeight: 1.45,
                letterSpacing: '-0.01em', color: 'var(--ink)',
                opacity: generating ? 0.35 : 1,
                transition: 'opacity 0.4s ease',
              }}>
                {capsule.declaration}
              </p>
              {capsule.rules.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 5, opacity: generating ? 0.35 : 1 }}>
                  {capsule.rules.slice(0, 6).map((r, i) => (
                    <RulePill key={i} rule={r} />
                  ))}
                  {capsule.rules.length > 6 && (
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                      +{capsule.rules.length - 6} more rules
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <p style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--ink-faint)', lineHeight: 1.55, textAlign: 'center', paddingTop: 8 }}>
              No capsule yet.{'\n'}Add captures to this context, then generate.
            </p>
          )}
        </div>

        {/* Error */}
        {generateError && (
          <div style={{
            marginBottom: 16, padding: '12px 16px',
            background: 'rgba(158,52,66,0.06)', border: '1px solid rgba(158,52,66,0.25)',
            borderRadius: 8, fontSize: 12, color: 'var(--red)', fontFamily: 'var(--mono)',
          }}>
            {generateError}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            width: '100%', padding: '15px',
            background: generating ? 'var(--line)' : 'var(--violet)',
            color: generating ? 'var(--ink-faint)' : 'white',
            border: 'none', borderRadius: 10,
            fontFamily: 'var(--mono)', fontSize: 12,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: generating ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s', marginBottom: 12,
          }}
        >
          {generating ? 'Generating…' : capsule ? 'Generate new version' : 'Generate capsule'}
        </button>

        {/* Frequency word cloud */}
        {capsule && Object.keys(capsule.frequency_map ?? {}).length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <SectionLabel>Frequency Map</SectionLabel>
            <FrequencyCloud map={capsule.frequency_map} />
          </section>
        )}

        {/* Version history */}
        {history.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <SectionLabel>Version History</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((h, i) => (
                <HistoryRow
                  key={h.id}
                  capsule={h}
                  isCurrent={i === 0}
                  isSelected={selectedHistoryId === h.id}
                  onSelect={() => {
                    setShowDiff(false)
                    setSelectedHistoryId(prev => prev === h.id ? null : h.id)
                  }}
                />
              ))}
            </div>

            {capsule && compareTarget && selectedHistoryId !== capsule.id && (
              <button
                onClick={() => setShowDiff(v => !v)}
                style={{
                  marginTop: 12, padding: '10px 20px',
                  background: 'none', border: '1.5px solid var(--violet)',
                  borderRadius: 8, color: 'var(--violet)',
                  fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
                }}
              >
                {showDiff ? 'Hide diff' : `Compare ${compareTarget.version} → ${capsule.version}`}
              </button>
            )}
          </section>
        )}

        {/* Diff */}
        {diff && capsule && compareTarget && (
          <DiffSection diff={diff} v1={compareTarget} v2={capsule} />
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function RulePill({ rule }: { rule: DistilledRule }) {
  const verbColor: Record<string, string> = {
    ALWAYS: 'var(--green)', NEVER: 'var(--red)',
    PREFER: 'var(--violet)', AVOID: 'var(--ink-faint)',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{
        fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.08em',
        color: verbColor[rule.verb] ?? 'var(--ink)',
        background: 'var(--panel)', padding: '2px 6px', borderRadius: 3,
        border: '1px solid var(--line-soft)', flexShrink: 0, marginTop: 1,
      }}>
        {rule.verb}
      </span>
      <span style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
        {rule.domain ? <><strong style={{ color: 'var(--ink)' }}>{rule.domain}:</strong>{' '}</> : null}
        {rule.text}
      </span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginBottom: 10,
    }}>
      {children}
    </p>
  )
}

function FrequencyCloud({ map }: { map: Record<string, number> }) {
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
  const maxW = sorted[0]?.[1] ?? 1
  return (
    <div style={{ lineHeight: 1.9 }}>
      {sorted.map(([word, weight]) => {
        const size = 11 + Math.round((weight / maxW) * 14)
        const opacity = 0.35 + (weight / maxW) * 0.65
        return (
          <span key={word} style={{
            fontSize: size, fontFamily: 'var(--display)',
            color: 'var(--ink)', opacity,
            marginRight: 10, display: 'inline-block',
            letterSpacing: '-0.01em',
          }}>
            {word}
          </span>
        )
      })}
    </div>
  )
}

function HistoryRow({ capsule, isCurrent, isSelected, onSelect }: {
  capsule: Capsule; isCurrent: boolean; isSelected: boolean; onSelect: () => void
}) {
  const date = new Date(capsule.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', gap: 12, padding: '12px 14px',
        background: isSelected ? 'rgba(74,61,176,0.06)' : 'var(--cream-2)',
        border: `1.5px solid ${isSelected ? 'var(--violet)' : 'var(--line-soft)'}`,
        borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--violet)', fontWeight: 500 }}>
            {capsule.version}
          </span>
          {isCurrent && (
            <span style={{
              fontSize: 8, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--ink-faint)', background: 'var(--panel)', padding: '1px 5px', borderRadius: 3,
            }}>
              current
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>
            {date}
          </span>
        </div>
        <p style={{
          fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        } as unknown as React.CSSProperties}>
          {capsule.declaration}
        </p>
      </div>
    </button>
  )
}

function DiffSection({ diff, v1, v2 }: { diff: CapsuleDiffResult; v1: Capsule; v2: Capsule }) {
  const addedSet = new Set(diff.declaration.added)
  const removedSet = new Set(diff.declaration.removed)

  function highlight(text: string, markAdded: boolean) {
    return text.split(/(\W+)/).map((part, i) => {
      const lower = part.toLowerCase()
      const hit = markAdded ? addedSet.has(lower) : removedSet.has(lower)
      return (
        <span key={i} style={{
          background: hit ? (markAdded ? 'rgba(31,122,80,0.15)' : 'rgba(158,52,66,0.15)') : 'transparent',
          color: hit ? (markAdded ? 'var(--green)' : 'var(--red)') : 'inherit',
          borderRadius: 2,
        }}>
          {part}
        </span>
      )
    })
  }

  return (
    <div>
      <SectionLabel>Comparing {v1.version} → {v2.version}</SectionLabel>

      <div style={{ padding: '16px', background: 'var(--cream-2)', border: '1px solid var(--line)', borderRadius: 10, marginBottom: 14 }}>
        <SectionLabel>Declaration</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <p style={{ fontSize: 9, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginBottom: 6 }}>Before</p>
            <p style={{ fontSize: 13, fontFamily: 'var(--display)', lineHeight: 1.5, color: 'var(--ink-soft)' }}>
              {highlight(v1.declaration, false)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 9, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginBottom: 6 }}>After</p>
            <p style={{ fontSize: 13, fontFamily: 'var(--display)', lineHeight: 1.5, color: 'var(--ink)' }}>
              {highlight(v2.declaration, true)}
            </p>
          </div>
        </div>
      </div>

      {(diff.rules.added.length > 0 || diff.rules.removed.length > 0) && (
        <div style={{ padding: '16px', background: 'var(--cream-2)', border: '1px solid var(--line)', borderRadius: 10 }}>
          <SectionLabel>Rule Changes</SectionLabel>
          {diff.rules.added.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
              <span style={{ color: 'var(--green)', fontSize: 13, fontFamily: 'var(--mono)', flexShrink: 0 }}>+</span>
              <RulePill rule={r} />
            </div>
          ))}
          {diff.rules.removed.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
              <span style={{ color: 'var(--red)', fontSize: 13, fontFamily: 'var(--mono)', flexShrink: 0 }}>−</span>
              <div style={{ opacity: 0.55 }}><RulePill rule={r} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
