'use client'

import type { Capsule, DistilledRule } from '@/types/capsule'
import type { Context } from '@/types/context'

export type DossierTheme = 'paper' | 'dark'

interface Props {
  capsule: Capsule
  context: Context
  parent: Context | null
  theme: DossierTheme
  isOwner: boolean
  onThemeToggle?: () => void
  onExportPDF?: () => void
}

export function DossierDocument({ capsule, context, parent, theme, isOwner: _isOwner, onThemeToggle, onExportPDF }: Props) {
  const isDark = theme === 'dark'

  const bg = isDark ? '#1A1714' : 'var(--cream)'
  const ink = isDark ? '#EDE8DF' : 'var(--ink)'
  const inkSoft = isDark ? '#A09890' : 'var(--ink-soft)'
  const inkFaint = isDark ? '#6A6058' : 'var(--ink-faint)'
  const lineColor = isDark ? '#302C28' : 'var(--rule)'
  const violetColor = isDark ? '#7B70E0' : 'var(--violet)'

  const contextTypeLabel = context.type === 'brand' ? 'Brand Capsule' : 'Project Capsule'

  const date = new Date(capsule.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  // Group rules by verb
  const rules = capsule.rules ?? []
  const byVerb: Record<string, DistilledRule[]> = { ALWAYS: [], NEVER: [], PREFER: [], AVOID: [] }
  for (const r of rules) {
    if (r.verb in byVerb) byVerb[r.verb].push(r)
  }

  // Frequency words sorted by weight descending
  const freqWords = Object.entries(capsule.frequency_map ?? {}).sort((a, b) => b[1] - a[1])
  const maxWeight = freqWords[0]?.[1] ?? 1

  return (
    <div style={{ background: bg, color: ink, minHeight: '100vh', fontFamily: 'var(--mono)' }}>

      {/* ── Running Head ── */}
      <div
        data-running-head
        style={{
          borderBottom: `1px solid ${lineColor}`,
          padding: '10px 40px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          position: 'sticky',
          top: 0,
          background: bg,
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: inkFaint }}>
          {parent ? `${parent.name} / ` : ''}{context.name}
        </span>
        <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: inkFaint, marginLeft: 'auto' }}>
          {contextTypeLabel}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: violetColor }}>
          {capsule.version}
        </span>
        <span style={{ fontSize: 10, color: inkFaint }}>{date}</span>

        {/* Theme toggle */}
        {onThemeToggle && (
          <button
            data-no-print
            onClick={onThemeToggle}
            style={{
              background: 'none',
              border: `1px solid ${lineColor}`,
              borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: inkFaint, fontFamily: 'var(--mono)',
            }}
          >
            {isDark ? '☀ Paper' : '◑ Dark'}
          </button>
        )}

        {/* Export PDF */}
        {onExportPDF && (
          <button
            data-no-print
            onClick={onExportPDF}
            style={{
              background: 'none',
              border: `1px solid ${lineColor}`,
              borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: inkFaint, fontFamily: 'var(--mono)',
            }}
          >
            Export PDF
          </button>
        )}
      </div>

      {/* ── Document body ── */}
      <div className="dossier-container" style={{ maxWidth: 1120, margin: '0 auto', padding: '60px 40px 120px' }}>

        {/* ── Masthead ── */}
        <header className="dossier-header" style={{ marginBottom: 64, borderBottom: `1px solid ${lineColor}`, paddingBottom: 48 }}>
          <p style={{
            fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: inkFaint, marginBottom: 16, fontFamily: 'var(--mono)',
          }}>
            {contextTypeLabel}
          </p>
          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 400, letterSpacing: '-0.03em', color: ink,
            lineHeight: 1.0, marginBottom: 24,
          }}>
            {context.name}
          </h1>

          {/* Version meta row */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 32, flexWrap: 'wrap' }}>
            <MetaField label="Version" value={capsule.version} color={violetColor} inkFaint={inkFaint} />
            <MetaField label="Date" value={date} inkFaint={inkFaint} />
            <MetaField label="Rules" value={String(rules.length)} inkFaint={inkFaint} />
            <MetaField label="Words" value={String(freqWords.length)} inkFaint={inkFaint} />
            {parent && <MetaField label="Parent" value={parent.name} inkFaint={inkFaint} />}
          </div>

          {/* Declaration */}
          <blockquote style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(18px, 2.8vw, 28px)',
            lineHeight: 1.38,
            letterSpacing: '-0.01em',
            color: ink,
            margin: 0,
            maxWidth: 800,
            borderLeft: `3px solid ${violetColor}`,
            paddingLeft: 24,
          }}>
            {capsule.declaration}
          </blockquote>
        </header>

        {/* ── Section 1: Frequency Map ── */}
        {freqWords.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <SectionHead label="01" title="Frequency Map" lineColor={lineColor} inkFaint={inkFaint} />
            <div className="frequency-words" style={{ lineHeight: 2.0, maxWidth: 900 }}>
              {freqWords.map(([word, weight]) => {
                const size = 12 + Math.round((weight / maxWeight) * 22)
                const opacity = 0.3 + (weight / maxWeight) * 0.7
                return (
                  <span key={word} style={{
                    fontSize: size, fontFamily: 'var(--display)',
                    color: ink, opacity,
                    marginRight: 14, display: 'inline-block',
                    letterSpacing: '-0.01em',
                  }}>
                    {word}
                  </span>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Section 2: Rules Table ── */}
        {rules.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <SectionHead label="02" title="Rules" lineColor={lineColor} inkFaint={inkFaint} />
            <div className="rules-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              {(['ALWAYS', 'NEVER', 'PREFER', 'AVOID'] as const).map(verb => (
                <VerbColumn
                  key={verb}
                  verb={verb}
                  rules={byVerb[verb]}
                  lineColor={lineColor}
                  ink={ink}
                  inkSoft={inkSoft}
                  inkFaint={inkFaint}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Section 3: About ── */}
        {context.description && (
          <section style={{ marginBottom: 64 }}>
            <SectionHead label="03" title="About" lineColor={lineColor} inkFaint={inkFaint} />
            <p style={{
              fontSize: 14, lineHeight: 1.65, color: inkSoft,
              maxWidth: 640, fontFamily: 'var(--mono)',
            }}>
              {context.description}
            </p>
          </section>
        )}

        {/* ── Footer ── */}
        <footer style={{
          borderTop: `1px solid ${lineColor}`, paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
          fontSize: 10, color: inkFaint, letterSpacing: '0.1em',
          textTransform: 'uppercase', fontFamily: 'var(--mono)',
        }}>
          <span>Taste — Capsule {capsule.version}</span>
          <span>{context.name}</span>
          <span>{date}</span>
        </footer>
      </div>

      {/* ── Print stylesheet ── */}
      <style>{`
        @media print {
          body { background: #F3ECDD !important; color: #141210 !important; }
          [data-no-print] { display: none !important; }
          [data-running-head] { position: static !important; }
          @page { margin: 20mm 15mm; }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function MetaField({ label, value, color, inkFaint }: { label: string; value: string; color?: string; inkFaint: string }) {
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: inkFaint, marginBottom: 3, fontFamily: 'var(--mono)' }}>
        {label}
      </p>
      <p style={{ fontSize: 13, fontFamily: 'var(--mono)', color: color ?? 'inherit' }}>
        {value}
      </p>
    </div>
  )
}

function SectionHead({ label, title, lineColor, inkFaint }: { label: string; title: string; lineColor: string; inkFaint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24, borderBottom: `1px solid ${lineColor}`, paddingBottom: 10 }}>
      <span style={{ fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.2em', color: inkFaint }}>
        {label}
      </span>
      <span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: inkFaint, fontFamily: 'var(--mono)' }}>
        {title}
      </span>
    </div>
  )
}

function VerbColumn({ verb, rules, lineColor, ink: _ink, inkSoft, inkFaint }: {
  verb: 'ALWAYS' | 'NEVER' | 'PREFER' | 'AVOID'
  rules: DistilledRule[]
  lineColor: string; ink: string; inkSoft: string; inkFaint: string
}) {
  const verbColor: Record<string, string> = {
    ALWAYS: 'var(--green)', NEVER: 'var(--red)',
    PREFER: 'var(--violet)', AVOID: 'var(--ink-faint)',
  }
  return (
    <div>
      <p style={{
        fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: verbColor[verb], fontFamily: 'var(--mono)',
        borderBottom: `1px solid ${lineColor}`, paddingBottom: 8, marginBottom: 12,
      }}>
        {verb}
      </p>
      {rules.length === 0 ? (
        <p style={{ fontSize: 11, color: inkFaint, fontStyle: 'italic' }}>—</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map((r, i) => (
            <div key={i}>
              {r.domain && (
                <p style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: inkFaint, marginBottom: 2, fontFamily: 'var(--mono)' }}>
                  {r.domain}
                </p>
              )}
              <p style={{ fontSize: 12, color: inkSoft, lineHeight: 1.45 }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
