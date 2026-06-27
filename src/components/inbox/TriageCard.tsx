'use client'

import { useRef, useCallback, useEffect } from 'react'
import type { Capture } from '@/types/capture'
import { TagRow } from './TagRow'

const STATIC_TAGS = ['composition', 'lighting', 'texture', 'color', 'minimal', 'editorial', 'restraint', 'material']
const THRESHOLD = 80

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface Props {
  capture: Capture
  observation: string
  selectedTags: string[]
  onObservationChange: (val: string) => void
  onTagToggle: (tag: string) => void
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

export function TriageCard({
  capture, observation, selectedTags,
  onObservationChange, onTagToggle,
  onSwipeLeft, onSwipeRight,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, currentX: 0 })

  const applyTransform = useCallback((dx: number) => {
    const card = cardRef.current
    if (!card) return
    card.style.transform = `translateX(${dx}px) rotate(${dx * 0.03}deg)`
    const addHint = card.querySelector<HTMLElement>('[data-hint="add"]')
    const skipHint = card.querySelector<HTMLElement>('[data-hint="skip"]')
    const ratio = Math.min(1, Math.abs(dx) / 100)
    if (dx > 0) {
      if (addHint) addHint.style.opacity = String(ratio)
      if (skipHint) skipHint.style.opacity = '0'
    } else {
      if (skipHint) skipHint.style.opacity = String(ratio)
      if (addHint) addHint.style.opacity = '0'
    }
  }, [])

  const resetTransform = useCallback(() => {
    const card = cardRef.current
    if (!card) return
    card.style.transition = 'transform 0.22s cubic-bezier(0.4,0,0.2,1)'
    card.style.transform = 'none'
    card.querySelectorAll<HTMLElement>('[data-hint]').forEach(el => { el.style.opacity = '0' })
    setTimeout(() => { if (card) card.style.transition = 'none' }, 240)
  }, [])

  const exitCard = useCallback((dir: 'left' | 'right') => {
    const card = cardRef.current
    if (!card) return
    card.style.transition = 'transform 0.28s ease, opacity 0.24s ease'
    card.style.transform = dir === 'right' ? 'translateX(110vw) rotate(6deg)' : 'translateX(-110vw) rotate(-6deg)'
    card.style.opacity = '0'
  }, [])

  const isInteractive = (target: EventTarget | null) =>
    !!(target as HTMLElement)?.closest('textarea, button, input')

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isInteractive(e.target)) return
    drag.current = { active: true, startX: e.touches[0].clientX, currentX: e.touches[0].clientX }
    if (cardRef.current) cardRef.current.style.transition = 'none'
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!drag.current.active) return
    drag.current.currentX = e.touches[0].clientX
    applyTransform(drag.current.currentX - drag.current.startX)
  }, [applyTransform])

  const onTouchEnd = useCallback(() => {
    if (!drag.current.active) return
    drag.current.active = false
    const dx = drag.current.currentX - drag.current.startX
    if (dx > THRESHOLD) { exitCard('right'); setTimeout(onSwipeRight, 300) }
    else if (dx < -THRESHOLD) { exitCard('left'); setTimeout(onSwipeLeft, 300) }
    else resetTransform()
  }, [exitCard, onSwipeLeft, onSwipeRight, resetTransform])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isInteractive(e.target)) return
    drag.current = { active: true, startX: e.clientX, currentX: e.clientX }
    if (cardRef.current) cardRef.current.style.transition = 'none'
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!drag.current.active) return
    drag.current.currentX = e.clientX
    applyTransform(drag.current.currentX - drag.current.startX)
  }, [applyTransform])

  const onMouseUp = useCallback(() => {
    if (!drag.current.active) return
    drag.current.active = false
    const dx = drag.current.currentX - drag.current.startX
    if (dx > THRESHOLD) { exitCard('right'); setTimeout(onSwipeRight, 300) }
    else if (dx < -THRESHOLD) { exitCard('left'); setTimeout(onSwipeLeft, 300) }
    else resetTransform()
  }, [exitCard, onSwipeLeft, onSwipeRight, resetTransform])

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const aiTags = capture.ai_tags ?? []
  const deduped = Array.from(new Set(aiTags.concat(STATIC_TAGS)))
  const suggestions = deduped.slice(0, 8)
  const isVoice = capture.type === 'voice'

  const WAVE_H = [32, 56, 44, 72, 52, 38, 64, 48, 36, 60]
  const WAVE_ANIM = ['wave-a', 'wave-b', 'wave-c', 'wave-d', 'wave-b', 'wave-a', 'wave-c', 'wave-d', 'wave-b', 'wave-c']

  const contentSection = (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11,
        color: 'rgba(243,236,221,0.4)',
        marginBottom: 10, letterSpacing: '0.03em',
      }}>
        {isVoice ? 'Voice note' : 'Camera Roll'} · {timeAgo(capture.created_at)}
      </div>
      <div style={{ marginBottom: 10 }}>
        <TagRow suggestions={suggestions} selected={selectedTags} onToggle={onTagToggle} />
      </div>
      <div style={{ height: 1, background: 'rgba(243,236,221,0.12)', marginBottom: 10 }} />
      <textarea
        placeholder="What do you notice?"
        value={observation}
        onChange={e => onObservationChange(e.target.value)}
        rows={1}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 16,
          color: '#F3ECDD',
          resize: 'none',
          lineHeight: 1.45,
          padding: 0,
          fontFamily: 'var(--display)',
          maxHeight: 80,
          overflow: 'hidden',
          display: 'block',
          boxSizing: 'border-box',
        }}
        onInput={e => {
          const t = e.currentTarget
          t.style.height = 'auto'
          t.style.height = Math.min(t.scrollHeight, 80) + 'px'
        }}
      />
    </div>
  )

  return (
    <div
      ref={cardRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute', inset: 0,
        userSelect: 'none',
        cursor: 'grab',
        willChange: 'transform',
        overflow: 'hidden',
      }}
    >
      {isVoice ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#111',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 72, marginBottom: 24 }}>
              {WAVE_H.map((h, i) => (
                <div key={i} style={{
                  width: 3, height: h,
                  background: 'rgba(74,61,176,0.5)',
                  borderRadius: 1.5,
                  transformOrigin: 'bottom',
                  animation: `${WAVE_ANIM[i]} ${1.4 + i * 0.12}s ease-in-out infinite`,
                }} />
              ))}
            </div>
            {capture.content && (
              <p style={{
                margin: 0,
                fontFamily: 'var(--display)',
                fontSize: 16,
                color: 'rgba(243,236,221,0.75)',
                lineHeight: 1.6,
                textAlign: 'center',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
              } as React.CSSProperties}>
                {capture.content}
              </p>
            )}
          </div>
          {contentSection}
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0 }}>
          {capture.media_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capture.media_url}
              alt={capture.content || 'capture'}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              animation: 'shimmer 1.4s ease-in-out infinite',
            }} />
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.7) 45%, #0A0A0A 92%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            {contentSection}
          </div>
        </div>
      )}

      <div data-hint="add" style={{
        position: 'absolute', top: '38%', right: 16,
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', fontWeight: 700,
        color: '#7B71E8', background: 'rgba(0,0,0,0.55)',
        padding: '4px 8px', opacity: 0, pointerEvents: 'none',
      }}>ADD →</div>
      <div data-hint="skip" style={{
        position: 'absolute', top: '38%', left: 16,
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', fontWeight: 700,
        color: 'rgba(243,236,221,0.75)', background: 'rgba(0,0,0,0.55)',
        padding: '4px 8px', opacity: 0, pointerEvents: 'none',
      }}>← SKIP</div>
    </div>
  )
}
