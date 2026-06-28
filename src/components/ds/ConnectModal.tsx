'use client'

import { useState } from 'react'
import type {
  ConnectStep,
  DSSource,
  DSValidationResult,
  ConnectDSInput,
} from '@/lib/types/design-system'
import { createDSConnection } from '@/lib/ds-connections'

// ── types ────────────────────────────────────────────────────

interface ConnectModalProps {
  userId: string
  onSuccess: (connectionId: string) => void
  onClose: () => void
}

// Flat state type that covers all source field combinations
interface InputState {
  name?: string
  description?: string
  context_id?: string
  github_repo?: string
  github_branch?: string
  github_skill_path?: string
  github_tokens_path?: string
  github_pat?: string
  raw_skill_url?: string
  raw_tokens_url?: string
  raw_bundle_url?: string
}

// ── sub-components ───────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      fontSize: 9,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      color: 'var(--ink-faint)',
      display: 'block',
      marginBottom: 6,
    }}>
      {children}
    </label>
  )
}

function Field({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '12px',
        background: 'var(--cream-2)',
        border: '1.5px solid var(--line-soft)',
        borderRadius: 8,
        color: 'var(--ink)',
        fontSize: 14,
        fontFamily: 'var(--mono)',
        outline: 'none',
        boxSizing: 'border-box' as const,
        minHeight: 48,
        ...style,
      }}
    />
  )
}

// ── main component ───────────────────────────────────────────

export function ConnectModal({ userId, onSuccess, onClose }: ConnectModalProps) {
  const [step, setStep] = useState<ConnectStep>('choose-source')
  const [source, setSource] = useState<DSSource | null>(null)
  const [input, setInput] = useState<InputState>({})
  const [validation, setValidation] = useState<DSValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function setField(key: keyof InputState, value: string) {
    setInput(prev => ({ ...prev, [key]: value }))
  }

  function goBack() {
    setError(null)
    setStep('choose-source')
  }

  function isFormValid(): boolean {
    if (!input.name?.trim()) return false
    if (source === 'github') return !!input.github_repo?.includes('/')
    if (source === 'url')    return !!input.raw_skill_url?.trim()
    return true
  }

  async function handleValidate() {
    if (source === 'manual') {
      await handleSave()
      return
    }
    setStep('validating')
    setError(null)
    try {
      const res = await fetch('/api/ds/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, source }),
      })
      const data: DSValidationResult = await res.json()
      if (!data.valid) {
        setError(data.error ?? 'Validation failed')
        setStep('configure')
        return
      }
      if (data.ds_name_detected && !input.name?.trim()) {
        setInput(prev => ({ ...prev, name: data.ds_name_detected! }))
      }
      setValidation(data)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
      setStep('configure')
    }
  }

  async function handleSave() {
    setStep('saving')
    setError(null)
    try {
      const finalInput = { ...input, source: source! } as ConnectDSInput
      const resolvedUrls = {
        skill_md_url: validation?.skill_md_url ?? undefined,
        tokens_css_url: validation?.tokens_css_url ?? undefined,
      }
      const conn = await createDSConnection(userId, finalInput, resolvedUrls)
      setStep('success')
      setTimeout(() => onSuccess(conn.id), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
      setStep(source === 'manual' ? 'configure' : 'preview')
    }
  }

  // ── step renders ──────────────────────────────────────────

  function renderChooseSource() {
    const options: { src: DSSource; icon: string; label: string; hint: string }[] = [
      { src: 'github', icon: '⌥', label: 'GitHub',  hint: 'Public or private repo with a SKILL.md file' },
      { src: 'url',    icon: '◈', label: 'URL',     hint: 'Supabase Storage, CDN, or any public SKILL.md URL' },
      { src: 'manual', icon: '✦', label: 'Manual',  hint: 'No DS yet — Curato will generate one from your capsule' },
    ]
    return (
      <div>
        <p style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', marginBottom: 6, letterSpacing: '-0.02em' }}>
          Where does your design system live?
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 24, lineHeight: 1.5 }}>
          Curato reads your SKILL.md to understand your design constraints.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map(opt => (
            <button
              key={opt.src}
              onClick={() => { setSource(opt.src); setInput({}); setError(null); setStep('configure') }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                minHeight: 64,
                padding: '14px 16px',
                background: 'var(--cream-2)',
                border: '1.5px solid var(--line-soft)',
                borderRadius: 10,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 22, color: 'var(--violet)', width: 28, flexShrink: 0 }}>{opt.icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)', marginBottom: 2 }}>{opt.label}</span>
                <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{opt.hint}</span>
              </span>
              <span style={{ fontSize: 14, color: 'var(--ink-faint)' }}>→</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderConfigure() {
    const stepNum = source === 'github' ? '2' : source === 'url' ? '2' : '2'
    const isManual = source === 'manual'
    const disabled = !isFormValid()

    return (
      <div>
        {/* Back + step label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            onClick={goBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', minHeight: 48, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Back
          </button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.08em' }}>
            STEP {stepNum} OF 3
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name — all sources */}
          <div>
            <Label>Design system name <span style={{ color: 'var(--red)' }}>*</span></Label>
            <Field
              autoFocus
              value={input.name ?? ''}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. Curato Design System"
            />
          </div>

          {source === 'github' && (
            <>
              <div>
                <Label>Repository <span style={{ color: 'var(--red)' }}>*</span></Label>
                <Field
                  value={input.github_repo ?? ''}
                  onChange={e => setField('github_repo', e.target.value)}
                  placeholder="owner/repo"
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Label>Branch</Label>
                  <Field
                    value={input.github_branch ?? ''}
                    onChange={e => setField('github_branch', e.target.value)}
                    placeholder="main"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Label>SKILL.md path</Label>
                  <Field
                    value={input.github_skill_path ?? ''}
                    onChange={e => setField('github_skill_path', e.target.value)}
                    placeholder="SKILL.md"
                  />
                </div>
              </div>

              <div>
                <Label>Personal access token (optional)</Label>
                <Field
                  type="password"
                  value={input.github_pat ?? ''}
                  onChange={e => setField('github_pat', e.target.value)}
                  placeholder="ghp_…"
                />
                <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', marginTop: 4 }}>
                  Leave blank for public repos. Encrypted before storage.
                </p>
              </div>
            </>
          )}

          {source === 'url' && (
            <>
              <div>
                <Label>SKILL.md URL <span style={{ color: 'var(--red)' }}>*</span></Label>
                <Field
                  value={input.raw_skill_url ?? ''}
                  onChange={e => setField('raw_skill_url', e.target.value)}
                  placeholder="https://…/SKILL.md"
                />
              </div>

              <div>
                <Label>Tokens CSS URL (optional)</Label>
                <Field
                  value={input.raw_tokens_url ?? ''}
                  onChange={e => setField('raw_tokens_url', e.target.value)}
                  placeholder="https://…/tokens.css"
                />
              </div>
            </>
          )}

          {isManual && (
            <div style={{
              background: 'var(--cream-2)',
              border: '1.5px solid var(--line-soft)',
              borderRadius: 8,
              padding: '12px 14px',
            }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                Curato generates SKILL.md on your first capsule sync.
              </p>
            </div>
          )}
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={goBack}
            style={{
              flex: 1,
              minHeight: 48,
              background: 'none',
              border: '1.5px solid var(--line)',
              borderRadius: 8,
              fontFamily: 'var(--mono)',
              fontSize: 13,
              color: 'var(--ink-soft)',
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <button
            onClick={handleValidate}
            disabled={disabled}
            style={{
              flex: 2,
              minHeight: 48,
              background: disabled ? 'var(--line)' : 'var(--violet)',
              color: disabled ? 'var(--ink-faint)' : '#fff',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'var(--mono)',
              fontSize: 13,
              letterSpacing: '0.04em',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'background .15s',
            }}
          >
            {isManual ? 'Create' : 'Validate →'}
          </button>
        </div>
      </div>
    )
  }

  function renderValidating(label: string) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
        <span style={{
          fontSize: 36,
          color: 'var(--violet)',
          display: 'block',
          animation: 'ds-pulse 1.4s ease-in-out infinite',
          marginBottom: 16,
        }}>
          ◈
        </span>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', margin: 0 }}>{label}</p>
      </div>
    )
  }

  function renderPreview() {
    const v = validation!
    return (
      <div>
        {/* Back + step label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            onClick={() => { setError(null); setStep('configure') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', minHeight: 48, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Edit
          </button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.08em' }}>
            STEP 3 OF 3
          </span>
        </div>

        {error && (
          <div style={{ background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Summary card */}
        <div style={{ background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          {[
            ['Name',    input.name ?? '—'],
            ['Source',  source ?? '—'],
            ['SKILL.md', v.skill_md_url ? '✓ Found' : '— Not found'],
            ['Tokens',  v.tokens_css_url ? '✓ Found' : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: value.startsWith('✓') ? 'var(--green)' : 'var(--ink)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Skill preview */}
        {v.skill_md_preview && (
          <div style={{ marginBottom: 20 }}>
            <Label>SKILL.md preview</Label>
            <pre style={{
              margin: 0,
              padding: '12px',
              background: 'var(--ink)',
              color: 'var(--cream)',
              borderRadius: 8,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              lineHeight: 1.6,
              maxHeight: 140,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {v.skill_md_preview}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setError(null); setStep('configure') }}
            style={{ flex: 1, minHeight: 48, background: 'none', border: '1.5px solid var(--line)', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', cursor: 'pointer' }}
          >
            ← Edit
          </button>
          <button
            onClick={handleSave}
            style={{ flex: 2, minHeight: 48, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.04em', cursor: 'pointer' }}
          >
            Connect design system
          </button>
        </div>
      </div>
    )
  }

  function renderSuccess() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
        <span style={{ fontSize: 36, color: 'var(--green)', display: 'block', marginBottom: 12 }}>✓</span>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)', margin: 0 }}>Connected</p>
      </div>
    )
  }

  // ── render ─────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes ds-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.88); }
        }
        @media (min-width: 600px) {
          .ds-modal-overlay { align-items: center !important; }
          .ds-modal-panel   { border-radius: 12px !important; max-width: 560px !important; margin: 0 auto; }
        }
      `}</style>

      {/* Overlay — click closes */}
      <div
        className="ds-modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 200,
        }}
      >
        {/* Panel — click does NOT close */}
        <div
          className="ds-modal-panel"
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxHeight: '90dvh',
            overflowY: 'auto',
            background: 'var(--cream)',
            borderRadius: '16px 16px 0 0',
            paddingBottom: `max(env(safe-area-inset-bottom, 0px), 24px)`,
          }}
        >
          {/* Handle bar */}
          <div style={{ padding: '12px 20px 0' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line)', margin: '0 auto 20px' }} />
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            {step === 'choose-source' && renderChooseSource()}
            {step === 'configure'    && renderConfigure()}
            {step === 'validating'   && renderValidating('Checking…')}
            {step === 'preview'      && renderPreview()}
            {step === 'saving'       && renderValidating('Connecting…')}
            {step === 'success'      && renderSuccess()}
          </div>
        </div>
      </div>
    </>
  )
}
