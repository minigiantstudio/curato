'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ic } from '@/components/icons'
import {
  getContextWithParent,
  getCapturesForContext,
  getInheritedRules,
} from '@/lib/contexts'
import { FeedCard } from '@/components/feed/FeedCard'
import type { Context } from '@/types/context'
import type { Capture } from '@/types/capture'

type Tab = 'captures' | 'rules' | 'capsule'

interface PageProps {
  params: { id: string }
}

export default function ContextPage({ params }: PageProps) {
  const router = useRouter()
  const [context, setContext] = useState<Context | null>(null)
  const [parent, setParent] = useState<Context | null>(null)
  const [captures, setCaptures] = useState<Capture[]>([])
  const [inheritedRules, setInheritedRules] = useState<
    Array<{ rule: Capture; fromContext: Context }>
  >([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('captures')

  useEffect(() => {
    async function load() {
      try {
        const { context: ctx, parent: par } = await getContextWithParent(params.id)
        setContext(ctx)
        setParent(par)
        if (ctx) {
          const [caps, iRules] = await Promise.all([
            getCapturesForContext(params.id),
            getInheritedRules(params.id),
          ])
          setCaptures(caps)
          setInheritedRules(iRules)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const rules = captures.filter(c => c.type === 'rule')

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--cream)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>Loading…</span>
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

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px 0',
        background: 'rgba(243,236,221,0.96)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
        borderBottom: '1px solid var(--line-soft)',
      }}>
        {/* Back + type badge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
          >
            <Ic.back width={22} height={22} style={{ color: 'var(--ink)' }} />
          </button>

          <span style={{
            fontSize: 9,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: context.type === 'brand' ? 'var(--violet)' : 'var(--ink-faint)',
            background: context.type === 'brand' ? 'rgba(74,61,176,0.07)' : 'var(--panel)',
            padding: '3px 8px',
            borderRadius: 4,
            border: `1px solid ${context.type === 'brand' ? 'var(--violet)' : 'var(--line-soft)'}`,
          }}>
            {context.type}
          </span>
        </div>

        {/* Name */}
        <h1 style={{
          fontFamily: 'var(--display)',
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          marginBottom: 4,
        }}>
          {context.name}
        </h1>

        {/* Description */}
        {context.description && (
          <p style={{
            fontSize: 12,
            color: 'var(--ink-soft)',
            lineHeight: 1.5,
            marginBottom: 8,
          }}>
            {context.description}
          </p>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
            <strong style={{ color: 'var(--ink)', fontFamily: 'var(--display)', fontSize: 13 }}>
              {captures.length}
            </strong>{' '}
            captures
          </span>
          <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
            <strong style={{ color: 'var(--ink)', fontFamily: 'var(--display)', fontSize: 13 }}>
              {rules.length}
            </strong>{' '}
            rules
          </span>
        </div>

        {/* Parent inheritance banner */}
        {parent && inheritedRules.length > 0 && (
          <div style={{
            marginBottom: 12,
            padding: '8px 12px',
            background: 'rgba(74,61,176,0.06)',
            border: '1px solid rgba(74,61,176,0.15)',
            borderRadius: 8,
            fontSize: 11,
            color: 'var(--violet)',
          }}>
            Inheriting {inheritedRules.length} rule{inheritedRules.length !== 1 ? 's' : ''} from{' '}
            <strong>{parent.name}</strong>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--line-soft)' }}>
          {(['captures', 'rules', 'capsule'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab
                  ? '2px solid var(--ink)'
                  : '2px solid transparent',
                color: activeTab === tab ? 'var(--ink)' : 'var(--ink-faint)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'color .15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '16px 20px 100px' }}>
        {activeTab === 'captures' && (
          captures.length === 0
            ? <EmptyState title="No captures yet" body="Assign captures to this context from the feed." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {captures.map(c => <FeedCard key={c.id} capture={c} />)}
              </div>
            )
        )}

        {activeTab === 'rules' && (
          <RulesTab
            ownRules={rules}
            inheritedRules={inheritedRules}
            contextName={context.name}
          />
        )}

        {activeTab === 'capsule' && <CapsuleTab contextId={params.id} contextName={context.name} />}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 48 }}>
      <p style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--ink-soft)' }}>{title}</p>
      <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>{body}</p>
    </div>
  )
}

interface RulesTabProps {
  ownRules: Capture[]
  inheritedRules: Array<{ rule: Capture; fromContext: Context }>
  contextName: string
}

function RulesTab({ ownRules, inheritedRules, contextName }: RulesTabProps) {
  const ownCombos = new Set(
    ownRules.map(r => `${r.rule_verb ?? ''}:${r.domains[0] ?? ''}`)
  )

  return (
    <div>
      {ownRules.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>
            {contextName}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ownRules.map(r => <RuleCard key={r.id} rule={r} inherited={false} />)}
          </div>
        </section>
      )}

      {inheritedRules.length > 0 && (
        <section>
          <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>
            Inherited
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inheritedRules.map(({ rule, fromContext }) => {
              const combo = `${rule.rule_verb ?? ''}:${rule.domains[0] ?? ''}`
              const isOverridden = ownCombos.has(combo)
              return (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  inherited
                  inheritedFrom={fromContext.name}
                  overridden={isOverridden}
                />
              )
            })}
          </div>
        </section>
      )}

      {ownRules.length === 0 && inheritedRules.length === 0 && (
        <EmptyState title="No rules yet" body="Capture a rule and assign it to this context." />
      )}
    </div>
  )
}

interface RuleCardProps {
  rule: Capture
  inherited: boolean
  inheritedFrom?: string
  overridden?: boolean
}

function RuleCard({ rule, inherited, inheritedFrom, overridden }: RuleCardProps) {
  const verbColor: Record<string, string> = {
    ALWAYS: 'var(--green)',
    NEVER: 'var(--red)',
  }

  return (
    <div style={{
      background: 'var(--cream)',
      border: `1.5px solid ${inherited ? 'var(--line-soft)' : 'var(--line)'}`,
      borderRadius: 10,
      padding: '12px 14px',
      opacity: overridden ? 0.45 : inherited ? 0.75 : 1,
    }}>
      {inherited && inheritedFrom && (
        <p style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.08em', marginBottom: 6 }}>
          {overridden ? '⊘ Overridden' : '↓'} from {inheritedFrom}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {rule.rule_verb && (
          <span style={{
            fontSize: 9,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.08em',
            color: verbColor[rule.rule_verb] ?? 'var(--ink)',
            background: 'var(--cream-2)',
            padding: '3px 7px',
            borderRadius: 4,
            border: '1px solid var(--line-soft)',
            flexShrink: 0,
            marginTop: 1,
          }}>
            {rule.rule_verb}
          </span>
        )}
        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45, flex: 1 }}>
          {rule.content}
        </p>
      </div>

      {rule.domains.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {rule.domains.map(d => (
            <span key={d} style={{
              fontSize: 9,
              color: 'var(--ink-faint)',
              background: 'var(--panel)',
              padding: '2px 6px',
              borderRadius: 4,
            }}>
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function CapsuleTab({ contextId, contextName }: { contextId: string; contextName: string }) {
  const router = useRouter()
  return (
    <div style={{ paddingTop: 24 }}>
      <button
        onClick={() => router.push(`/capsule/${contextId}`)}
        style={{
          display: 'block',
          width: '100%',
          padding: '20px 24px',
          background: 'var(--cream-2)',
          border: '1.5px solid var(--line)',
          borderRadius: 12,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <p style={{
          fontFamily: 'var(--display)', fontSize: 16, color: 'var(--ink)',
          letterSpacing: '-0.01em', marginBottom: 6,
        }}>
          {contextName} Capsule
        </p>
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.5, marginBottom: 0 }}>
          Generate a taste synthesis — declaration, rules, frequency map.
        </p>
        <span style={{
          display: 'inline-block', marginTop: 12,
          fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--violet)',
          letterSpacing: '0.06em',
        }}>
          Open Capsule →
        </span>
      </button>
    </div>
  )
}
