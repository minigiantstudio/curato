'use client'

import { useState } from 'react'
import { Ic } from '@/components/icons'
import { Chip } from '@/components/ui/Chip'
import { DOMAINS, RULE_VERBS, type CaptureType, type Verdict, type RuleVerb } from '@/types/capture'
import type { Context } from '@/types/context'

export interface FocusContextData {
  verdict: Exclude<Verdict, null>
  domain: string | null
  take: string
  rule: { verb: RuleVerb; text: string } | null
}

interface FocusContextStepProps {
  brand: Context
  type: CaptureType
  content: string
  onBack: () => void
  onDone: (data: FocusContextData) => void
}

export function FocusContextStep({ brand, content, onBack, onDone }: FocusContextStepProps) {
  const [verdict, setVerdict] = useState<Exclude<Verdict, null> | null>(null)
  const [domain, setDomain] = useState<string>('')
  const [take, setTake] = useState(content)
  const [ruleOpen, setRuleOpen] = useState(false)
  const [ruleVerb, setRuleVerb] = useState<RuleVerb>('ALWAYS')
  const [ruleText, setRuleText] = useState('')

  const canSave = verdict !== null

  function handleSave() {
    if (verdict === null) return
    const rule = ruleOpen && ruleText.trim()
      ? { verb: ruleVerb, text: ruleText.trim() }
      : null
    onDone({ verdict, domain: domain || null, take, rule })
  }

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cream)', overflow: 'hidden' }}>
      {/* Header with pre-filled brand chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line-soft)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', padding: 4 }}>
          <Ic.back width={20} height={20} />
        </button>
        <span className="label">Context</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--violet)', color: '#fff', borderRadius: 20, padding: '4px 11px', fontSize: 11, fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ef0c4' }} />
          {brand.name}
        </span>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Verdict */}
        <div style={{ padding: '14px 16px 6px' }}>
          <div className="label" style={{ marginBottom: 8 }}>Is this {brand.name}?</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setVerdict('keep')}
              style={{
                flex: 1, borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                border: '2px solid var(--green)',
                background: verdict === 'keep' ? 'var(--green)' : 'var(--green-soft)',
                color: verdict === 'keep' ? '#fff' : 'var(--green)',
              }}
            >
              ◎ Good example
            </button>
            <button
              onClick={() => setVerdict('reject')}
              style={{
                flex: 1, borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                border: '2px solid var(--red)',
                background: verdict === 'reject' ? 'var(--red)' : 'var(--red-soft)',
                color: verdict === 'reject' ? '#fff' : 'var(--red)',
              }}
            >
              ✕ Not it
            </button>
          </div>
        </div>

        {/* Inline optional rule */}
        <div style={{ padding: '6px 16px 0' }}>
          {!ruleOpen ? (
            <button
              onClick={() => setRuleOpen(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                border: '1.5px dashed var(--line)', borderRadius: 12, padding: '12px 14px',
                background: 'none', color: 'var(--ink-soft)', fontSize: 13, cursor: 'pointer',
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--panel)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>+</span>
              Turn this into a rule (optional)
            </button>
          ) : (
            <div style={{ border: '1.5px solid var(--line-soft)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="label">Rule</span>
                <button onClick={() => { setRuleOpen(false); setRuleText('') }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 12 }}>Remove</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RULE_VERBS.map(v => (
                  <Chip key={v} label={v} variant={ruleVerb === v ? 'on' : 'off'} onClick={() => setRuleVerb(v)} />
                ))}
              </div>
              <textarea
                value={ruleText}
                onChange={e => setRuleText(e.target.value)}
                rows={2}
                placeholder="state the rule clearly…"
                style={{ resize: 'none', background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, padding: '10px 12px', lineHeight: 1.5 }}
              />
            </div>
          )}
        </div>

        {/* Domain */}
        <div style={{ padding: '14px 16px 6px' }}>
          <div className="label" style={{ marginBottom: 8 }}>Domain</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DOMAINS.map(d => (
              <Chip key={d} label={d} variant={domain === d ? 'on' : 'off'} onClick={() => setDomain(domain === d ? '' : d)} />
            ))}
          </div>
        </div>

        {/* Your take */}
        <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="label" style={{ marginBottom: 8 }}>Your take</div>
          <textarea
            value={take}
            onChange={e => setTake(e.target.value)}
            rows={3}
            placeholder="What does it feel like, exactly?"
            style={{ resize: 'none', background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, padding: '11px 13px', lineHeight: 1.55 }}
          />
        </div>
      </div>

      {/* Save */}
      <div style={{ padding: '10px 16px 14px', flexShrink: 0 }}>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            width: '100%', padding: '15px', borderRadius: 12,
            background: canSave ? 'var(--violet)' : 'var(--panel)',
            color: canSave ? '#fff' : 'var(--ink-faint)',
            fontSize: 13, letterSpacing: '0.04em',
            cursor: canSave ? 'pointer' : 'default',
            border: 'none',
            transition: 'background .2s, color .2s',
          }}
        >
          Save to {brand.name} →
        </button>
      </div>
    </div>
  )
}
