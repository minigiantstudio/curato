'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getInboxCaptures, updateCapture, saveCaptureWithMedia } from '@/lib/captures'
import { Ic } from '@/components/icons'
import type { Capture } from '@/types/capture'
import { TriageCard } from '@/components/inbox/TriageCard'
import { VoiceRecorder } from '@/components/inbox/VoiceRecorder'

type FlowState = 'loading' | 'triage' | 'empty' | 'recording'

const HEADER_H = 56
const ACTION_BAR_H = 112

export default function InboxPage() {
  const router = useRouter()
  const [flow, setFlow] = useState<FlowState>('loading')
  const [queue, setQueue] = useState<Capture[]>([])
  const [index, setIndex] = useState(0)
  const [observation, setObservation] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const prevFlowRef = useRef<FlowState>('triage')

  useEffect(() => {
    getInboxCaptures().then(items => {
      setQueue(items)
      setIndex(0)
      setFlow(items.length > 0 ? 'triage' : 'empty')
    })
  }, [])

  const current = queue[index]

  const resetCard = useCallback(() => {
    setObservation('')
    setSelectedTags([])
  }, [])

  const advance = useCallback((newQueue?: Capture[]) => {
    const q = newQueue ?? queue
    const next = index + 1
    if (next >= q.length) {
      setFlow('empty')
    } else {
      setIndex(next)
      resetCard()
    }
  }, [index, queue, resetCard])

  const doAdd = useCallback(async () => {
    if (!current || saving) return
    setSaving(true)
    await updateCapture(current.id, {
      verdict: 'keep',
      content: observation.trim() || current.content,
      tags: selectedTags.length > 0 ? selectedTags : (current.tags ?? []),
    })
    setSaving(false)
    advance()
  }, [current, saving, observation, selectedTags, advance])

  const doSkip = useCallback(() => {
    if (!current) return
    advance()
  }, [current, advance])

  const onTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }, [])

  const startRecording = useCallback(() => {
    prevFlowRef.current = flow
    setFlow('recording')
  }, [flow])

  const onRecordSave = useCallback(async (audioBlob: Blob, transcript: string) => {
    const file = new File([audioBlob], 'recording.webm', { type: audioBlob.type || 'audio/webm' })
    await saveCaptureWithMedia(
      { type: 'voice', content: transcript, verdict: null },
      file,
      'audio'
    )
    const fresh = await getInboxCaptures()
    setQueue(fresh)
    setIndex(0)
    resetCard()
    setFlow(fresh.length > 0 ? 'triage' : 'empty')
  }, [resetCard])

  const onRecordCancel = useCallback(() => {
    setFlow(prevFlowRef.current === 'recording' ? 'empty' : prevFlowRef.current)
  }, [])

  const remaining = queue.length - index
  const progress = queue.length > 0 ? index / queue.length : 0

  const safeTop = `calc(env(safe-area-inset-top, 0px) + ${HEADER_H}px)`
  const safeBottom = `calc(env(safe-area-inset-bottom, 0px) + ${ACTION_BAR_H}px)`

  return (
    <div style={{ background: '#0A0A0A', height: '100dvh', overflow: 'hidden', position: 'relative' }}>

      {/* Recording overlay */}
      {flow === 'recording' && (
        <VoiceRecorder onSave={onRecordSave} onCancel={onRecordCancel} />
      )}

      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: `calc(env(safe-area-inset-top, 0px) + ${HEADER_H}px)`,
        display: 'flex', alignItems: 'flex-end',
        padding: `0 20px 12px`,
        justifyContent: 'space-between',
        background: '#0A0A0A',
        borderBottom: '1px solid rgba(243,236,221,0.07)',
        zIndex: 20, boxSizing: 'border-box',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none',
            color: 'rgba(243,236,221,0.55)', cursor: 'pointer',
            padding: '4px 0', minHeight: 36, display: 'flex', alignItems: 'center',
          }}
        >
          <Ic.back width={22} height={22} />
        </button>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 12,
          color: 'rgba(243,236,221,0.5)',
          letterSpacing: '0.14em',
        }}>
          INBOX
        </span>
        {flow === 'triage' ? (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 12,
            color: 'var(--violet)', minWidth: 60, textAlign: 'right',
          }}>
            {remaining} left
          </span>
        ) : (
          <span style={{ minWidth: 60 }} />
        )}
      </div>

      {/* Triage state */}
      {flow === 'triage' && current && (
        <>
          {/* Card viewport */}
          <div style={{
            position: 'fixed',
            top: safeTop,
            bottom: safeBottom,
            left: 0, right: 0,
            overflow: 'hidden',
          }}>
            <TriageCard
              key={current.id}
              capture={current}
              observation={observation}
              selectedTags={selectedTags}
              onObservationChange={setObservation}
              onTagToggle={onTagToggle}
              onSwipeRight={doAdd}
              onSwipeLeft={doSkip}
            />
          </div>

          {/* Action bar */}
          <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            height: `calc(env(safe-area-inset-bottom, 0px) + ${ACTION_BAR_H}px)`,
            background: '#0A0A0A',
            borderTop: '1px solid rgba(243,236,221,0.07)',
            padding: `10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px)`,
            boxSizing: 'border-box',
            zIndex: 20,
          }}>
            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                flex: 1, height: 3,
                background: 'rgba(243,236,221,0.08)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: 3,
                  background: 'var(--violet)',
                  width: `${progress * 100}%`,
                  transition: 'width 0.35s ease',
                }} />
              </div>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 11,
                color: 'rgba(243,236,221,0.4)',
                whiteSpace: 'nowrap',
              }}>
                {index + 1} / {queue.length}
              </span>
            </div>
            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={doSkip}
                style={{
                  flex: 1, height: 52,
                  background: 'rgba(243,236,221,0.04)',
                  border: '1px solid rgba(243,236,221,0.14)',
                  borderRadius: 0,
                  fontFamily: 'var(--mono)', fontSize: 13,
                  color: 'rgba(243,236,221,0.65)',
                  cursor: 'pointer', letterSpacing: '0.03em',
                }}
              >
                Skip for now
              </button>
              <button
                onClick={doAdd}
                disabled={saving}
                style={{
                  flex: 1, height: 52,
                  background: saving ? 'rgba(74,61,176,0.5)' : 'var(--violet)',
                  border: 'none', borderRadius: 0,
                  fontFamily: 'var(--mono)', fontSize: 13,
                  color: '#F3ECDD',
                  cursor: saving ? 'wait' : 'pointer',
                  fontWeight: 600, letterSpacing: '0.03em',
                }}
              >
                {saving ? 'Saving…' : 'Add to library'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {flow === 'empty' && (
        <div style={{
          height: '100dvh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 40px 60px',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 56,
            color: 'rgba(74,61,176,0.35)',
            marginBottom: 24, lineHeight: 1,
          }}>◈</div>
          <h2 style={{
            fontFamily: 'var(--display)', fontSize: 22,
            fontWeight: 400, color: '#F3ECDD',
            margin: '0 0 10px', letterSpacing: '-0.01em',
          }}>
            {"You're caught up."}
          </h2>
          <p style={{
            fontSize: 14,
            color: 'rgba(243,236,221,0.4)',
            lineHeight: 1.7, margin: '0 0 48px',
            maxWidth: 220,
            fontFamily: 'var(--mono)',
          }}>
            Use the + button to capture photos, voice notes, or observations.
          </p>
          <button
            onClick={startRecording}
            style={{
              width: 76, height: 76,
              borderRadius: '50%',
              background: 'rgba(74,61,176,0.1)',
              border: '1px solid rgba(74,61,176,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--violet)',
              marginBottom: 12,
            }}
          >
            <Ic.mic width={28} height={28} />
          </button>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'rgba(243,236,221,0.3)',
            letterSpacing: '0.04em',
          }}>
            Record a voice note
          </span>
        </div>
      )}
    </div>
  )
}
