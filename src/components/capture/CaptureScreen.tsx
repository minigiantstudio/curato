'use client'

import { useState, useEffect, useRef } from 'react'
import { Ic } from '@/components/icons'
import { Wave } from '@/components/ui/Wave'
import { Chip } from '@/components/ui/Chip'
import {
  CAPTURE_TYPES, DOMAINS, RULE_VERBS, FEELING_MOODS,
  type CaptureType, type RuleVerb, type Verdict,
} from '@/types/capture'

interface CaptureScreenProps {
  type: CaptureType
  onBack: () => void
  onNext: (data: { content: string; mediaFile?: File; ruleVerb?: RuleVerb; ruleDomain?: string; verdict?: Verdict }) => void
}

// ── Reaction ─────────────────────────────────────────────────
function ReactionCapture({ onBack, onNext }: { onBack: () => void; onNext: CaptureScreenProps['onNext'] }) {
  const [annotation, setAnnotation] = useState('')
  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line-soft)' }}>
        <button onClick={onBack} style={{ background: 'none', color: 'var(--ink-soft)', cursor: 'pointer', padding: '10px 8px' }}>
          <Ic.back width={20} height={20} />
        </button>
        <span className="label">Reaction</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 16px', gap: 16 }}>
        <p style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          What are you reacting to?
        </p>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--line)' }}>
          <div style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg,#d8d0be,#e8e0d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)' }}>
            <Ic.camera width={32} height={32} />
          </div>
        </div>
        <textarea
          value={annotation}
          onChange={e => setAnnotation(e.target.value)}
          placeholder="Briefly describe what you're reacting to…"
          rows={2}
          style={{ resize: 'none', background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, padding: '10px 12px', lineHeight: 1.5 }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
          <button
            onClick={() => onNext({ content: annotation, verdict: 'reject' })}
            style={{ flex: 1, padding: '16px', background: 'var(--red-soft)', border: '2px solid var(--red)', borderRadius: 10, color: 'var(--red)', fontSize: 13, letterSpacing: '0.06em', cursor: 'pointer' }}
          >
            ✗  REJECT
          </button>
          <button
            onClick={() => onNext({ content: annotation, verdict: 'keep' })}
            style={{ flex: 1, padding: '16px', background: 'var(--green-soft)', border: '2px solid var(--green)', borderRadius: 10, color: 'var(--green)', fontSize: 13, letterSpacing: '0.06em', cursor: 'pointer' }}
          >
            ✓  KEEP
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Rule (mad-lib) ────────────────────────────────────────────
function RuleCapture({ onBack, onNext }: { onBack: () => void; onNext: CaptureScreenProps['onNext'] }) {
  const [verb, setVerb] = useState<RuleVerb>('ALWAYS')
  const [content, setContent] = useState('')
  const [domain, setDomain] = useState('')
  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line-soft)' }}>
        <button onClick={onBack} style={{ background: 'none', color: 'var(--ink-soft)', cursor: 'pointer', padding: '10px 8px' }}>
          <Ic.back width={20} height={20} />
        </button>
        <span className="label">State a Rule</span>
      </div>
      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <p style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 400, color: 'var(--ink-soft)', letterSpacing: '-0.01em' }}>
          Complete the constraint
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Directive</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RULE_VERBS.map(v => (
                <Chip key={v} label={v} variant={verb === v ? 'on' : 'off'} onClick={() => setVerb(v)} />
              ))}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>The constraint</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              <span style={{ color: 'var(--violet)', fontStyle: 'italic' }}>{verb}</span>{' '}
              <input
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="state the rule clearly…"
                style={{
                  background: 'none',
                  borderBottom: `2px solid ${content ? 'var(--ink)' : 'var(--line)'}`,
                  color: 'var(--ink)', fontSize: 18, padding: '2px 0', width: '100%',
                  letterSpacing: '-0.01em', fontFamily: 'var(--display)', marginTop: 4,
                }}
              />
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Domain <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 9, color: 'var(--ink-faint)' }}>(optional)</span></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DOMAINS.map(d => (
                <Chip key={d} label={d} variant={domain === d ? 'on' : 'off'} onClick={() => setDomain(domain === d ? '' : d)} />
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => onNext({ content, ruleVerb: verb, ruleDomain: domain })}
          disabled={!content}
          style={{
            marginTop: 'auto', padding: '15px',
            background: content ? 'var(--violet)' : 'var(--panel)',
            borderRadius: 10,
            color: content ? '#fff' : 'var(--ink-faint)',
            fontSize: 13, letterSpacing: '0.04em',
            cursor: content ? 'pointer' : 'default',
          }}
        >
          Save rule →
        </button>
      </div>
    </div>
  )
}

// ── Note / Feeling ────────────────────────────────────────────
function NoteCapture({ type, onBack, onNext }: { type: 'note' | 'feeling'; onBack: () => void; onNext: CaptureScreenProps['onNext'] }) {
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { taRef.current?.focus() }, [])

  const effectiveContent = type === 'feeling' ? (mood + (content ? ` — ${content}` : '')) : content

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line-soft)' }}>
        <button onClick={onBack} style={{ background: 'none', color: 'var(--ink-soft)', cursor: 'pointer', padding: '10px 8px' }}>
          <Ic.back width={20} height={20} />
        </button>
        <span className="label">{type === 'note' ? 'Observation' : 'Feeling'}</span>
      </div>
      <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {type === 'feeling' && (
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Response</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FEELING_MOODS.map(m => (
                <Chip key={m} label={m} variant={mood === m ? 'on' : 'off'} onClick={() => setMood(mood === m ? '' : m)} />
              ))}
            </div>
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="label" style={{ marginBottom: 8 }}>{type === 'note' ? 'Observation' : 'Describe it'}</div>
          <textarea
            ref={taRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={6}
            placeholder={type === 'note' ? 'Write your observation. No filter.' : 'What does it feel like, exactly?'}
            style={{ flex: 1, resize: 'none', background: 'var(--cream-2)', border: '1.5px solid var(--line-soft)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, padding: '12px 14px', lineHeight: 1.6 }}
          />
        </div>
        <button
          onClick={() => onNext({ content: effectiveContent })}
          style={{ padding: '15px', background: 'var(--violet)', borderRadius: 10, color: '#fff', fontSize: 13, letterSpacing: '0.04em', cursor: 'pointer', width: '100%' }}
        >
          Add context →
        </button>
      </div>
    </div>
  )
}

// ── Photo / Voice / Collection ────────────────────────────────
function MediaCapture({ type, onBack, onNext }: { type: 'photo' | 'voice' | 'collection'; onBack: () => void; onNext: CaptureScreenProps['onNext'] }) {
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const typeInfo = CAPTURE_TYPES.find(t => t.id === type)!

  // Auto-open camera on mount for photo/collection
  useEffect(() => {
    if (type !== 'voice') {
      inputRef.current?.click()
    }
  }, [type])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      recognitionRef.current?.abort()
    }
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    setMediaFile(file)
    setPreviewUrl(url)
  }

  function startRecording() {
    setVoiceError('')
    setTranscript('')
    setContent('')
    const w = window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }
    const SpeechRec: typeof SpeechRecognition | undefined = window.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SpeechRec) {
      setVoiceError('Voice input not supported in this browser.')
      return
    }
    const recognition = new SpeechRec()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = Array.from(event.results).map(r => r[0].transcript).join(' ').trim()
      setTranscript(text)
      setContent(text)
    }
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setVoiceError(event.error === 'not-allowed' ? 'Microphone access denied. Please allow mic access and try again.' : 'Transcription failed. Tap to try again.')
      setRecording(false)
    }
    recognition.onend = () => { setRecording(false) }
    try {
      recognition.start()
      setRecording(true)
    } catch {
      setVoiceError('Could not start recording. Try again.')
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }

  const canProceed = type === 'voice' ? transcript.length > 0 : (mediaFile != null || content.length > 0)

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line-soft)' }}>
        <button onClick={onBack} style={{ background: 'none', color: 'var(--ink-soft)', cursor: 'pointer', padding: '10px 8px' }}>
          <Ic.back width={20} height={20} />
        </button>
        <span className="label">{typeInfo.label}</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {type === 'voice' ? (
          <div style={{ margin: 16, borderRadius: 12, background: 'var(--panel)', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, border: '1.5px solid var(--line-soft)' }}>
            <Wave active={recording} />
            <button
              onClick={() => { if (recording) { stopRecording() } else { startRecording() } }}
              style={{
                width: 64, height: 64, borderRadius: 32,
                background: recording ? 'var(--red)' : 'var(--violet)',
                color: '#fff', border: 'none', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                animation: recording ? 'pulse 1.2s infinite' : 'none',
                boxShadow: `0 6px 20px ${recording ? 'rgba(158,52,66,0.4)' : 'rgba(74,61,176,0.35)'}`,
              }}
            >
              <Ic.mic width={26} height={26} />
            </button>
            <span style={{ fontSize: 11, color: recording ? 'var(--red)' : voiceError ? 'var(--red)' : 'var(--ink-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>
              {recording ? '● Recording…' : voiceError ? voiceError : transcript ? 'Tap to re-record' : 'Tap to record'}
            </span>
          </div>
        ) : (
          /* ── Photo / Collection ── */
          <div style={{ position: 'relative', margin: 16, borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--line-soft)' }}>
            {/* Hidden camera input — triggers native camera immediately */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Tap area: shows preview if photo taken, otherwise camera icon */}
            <div
              onClick={() => inputRef.current?.click()}
              style={{
                aspectRatio: type === 'collection' ? '3/2' : '4/3',
                background: previewUrl ? 'var(--ink)' : 'var(--panel)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                flexDirection: 'column', gap: 10,
                position: 'relative', overflow: 'hidden',
              }}
            >
              {previewUrl ? (
                /* Photo preview */
                <>
                  <img
                    src={previewUrl}
                    alt="Captured photo"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Retake button overlay */}
                  <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 2 }}>
                    <button
                      onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                      style={{
                        padding: '6px 12px', borderRadius: 20,
                        background: 'rgba(20,18,16,0.7)', backdropFilter: 'blur(6px)',
                        color: '#fff', fontSize: 11, letterSpacing: '0.04em',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      Retake
                    </button>
                  </div>
                </>
              ) : (
                /* Empty state */
                <>
                  <Ic.camera width={36} height={36} style={{ color: 'var(--ink-faint)' }} />
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>Take photo or upload</span>
                </>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: '4px 16px 12px' }}>
          <div className="label" style={{ marginBottom: 6 }}>
            {type === 'voice' ? (transcript ? 'Transcript — tap to edit' : 'Note') : 'Annotation'}
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={type === 'voice' ? 'Add a written note…' : previewUrl ? 'Add a note about this photo…' : 'Type an observation…'}
            rows={3}
            style={{ width: '100%', resize: 'none', background: transcript ? 'var(--cream)' : 'var(--cream-2)', border: `1.5px solid ${transcript ? 'var(--line)' : 'var(--line-soft)'}`, borderRadius: 8, color: 'var(--ink)', fontSize: 13, padding: '10px 12px', lineHeight: 1.55 }}
          />
        </div>
      </div>

      <div style={{ padding: '10px 16px 14px' }}>
        <button
          onClick={() => onNext({ content, mediaFile: mediaFile ?? undefined })}
          disabled={!canProceed}
          style={{
            width: '100%', padding: '15px',
            background: canProceed ? 'var(--violet)' : 'var(--panel)',
            borderRadius: 10,
            color: canProceed ? '#fff' : 'var(--ink-faint)',
            fontSize: 13, letterSpacing: '0.04em', cursor: canProceed ? 'pointer' : 'default',
            transition: 'background .2s, color .2s',
          }}
        >
          Add context →
        </button>
      </div>
    </div>
  )
}

// ── Exported CaptureScreen ────────────────────────────────────
export function CaptureScreen({ type, onBack, onNext }: CaptureScreenProps) {
  if (type === 'reaction') return <ReactionCapture onBack={onBack} onNext={onNext} />
  if (type === 'rule')     return <RuleCapture onBack={onBack} onNext={onNext} />
  if (type === 'note' || type === 'feeling') return <NoteCapture type={type} onBack={onBack} onNext={onNext} />
  return <MediaCapture type={type as 'photo' | 'voice' | 'collection'} onBack={onBack} onNext={onNext} />
}
