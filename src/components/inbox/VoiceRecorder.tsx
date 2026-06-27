'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  onSave: (audioBlob: Blob, transcript: string) => Promise<void>
  onCancel: () => void
}

const WAVE_HEIGHTS = [36, 68, 50, 84, 60, 40, 76, 52, 44, 72]
const WAVE_ANIMS = ['wave-a', 'wave-b', 'wave-c', 'wave-d', 'wave-b', 'wave-a', 'wave-c', 'wave-d', 'wave-b', 'wave-c']

export function VoiceRecorder({ onSave, onCancel }: Props) {
  const [seconds, setSeconds] = useState(0)
  const [saving, setSaving] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let mr: MediaRecorder

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream
        mr = new MediaRecorder(stream)
        mediaRef.current = mr
        chunksRef.current = []

        mr.ondataavailable = e => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        mr.start(100)
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
      })
      .catch(err => {
        console.error('Microphone access denied:', err)
        onCancel()
      })

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (mediaRef.current?.state !== 'inactive') {
        mediaRef.current?.stop()
      }
    }
  }, [onCancel])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
  }

  const handleStop = useCallback(async () => {
    const mr = mediaRef.current
    if (!mr || saving) return
    setSaving(true)
    if (timerRef.current) clearInterval(timerRef.current)

    await new Promise<void>(resolve => {
      mr.onstop = () => resolve()
      if (mr.state !== 'inactive') mr.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
    })

    const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })

    let transcript = ''
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json() as { transcript: string }
        transcript = data.transcript ?? ''
      }
    } catch {
      // proceed with empty transcript if transcription fails
    }

    await onSave(blob, transcript)
  }, [saving, onSave])

  const handleCancel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (mediaRef.current?.state !== 'inactive') mediaRef.current?.stop()
    onCancel()
  }, [onCancel])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 60,
    }}>
      {/* Cancel link */}
      <div style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 64px)',
        left: 20,
      }}>
        <button
          onClick={handleCancel}
          disabled={saving}
          style={{
            background: 'none', border: 'none',
            fontFamily: 'var(--mono)', fontSize: 13,
            color: 'rgba(243,236,221,0.5)',
            cursor: 'pointer', padding: '8px 0', minHeight: 44,
            letterSpacing: '0.03em',
          }}
        >
          Cancel
        </button>
      </div>

      {/* Animated waveform */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, marginBottom: 32, height: 84 }}>
        {WAVE_HEIGHTS.map((h, i) => (
          <div
            key={i}
            style={{
              width: 4, height: h,
              background: 'var(--violet)',
              borderRadius: 2,
              transformOrigin: 'bottom',
              animation: `${WAVE_ANIMS[i]} ${1.2 + i * 0.14}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Timer */}
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 34,
        color: '#F3ECDD', letterSpacing: '0.06em',
        fontWeight: 500, marginBottom: 52,
      }}>
        {formatTime(seconds)}
      </div>

      {/* Stop button */}
      <button
        onClick={handleStop}
        disabled={saving}
        style={{
          width: 80, height: 80,
          borderRadius: '50%',
          background: saving ? 'rgba(196,95,107,0.5)' : '#C45F6B',
          border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: saving ? 'wait' : 'pointer',
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ width: 24, height: 24, background: '#fff', borderRadius: 3 }} />
      </button>

      <span style={{
        fontFamily: 'var(--mono)', fontSize: 12,
        color: 'rgba(243,236,221,0.4)',
        letterSpacing: '0.04em',
      }}>
        {saving ? 'Saving...' : 'Tap to stop'}
      </span>

      {/* Home indicator space */}
      <div style={{
        position: 'absolute',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        display: 'flex', justifyContent: 'center', width: '100%',
      }}>
        <div style={{ width: 120, height: 4, background: 'rgba(243,236,221,0.07)', borderRadius: 2 }} />
      </div>
    </div>
  )
}
