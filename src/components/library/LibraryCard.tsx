'use client'

import type { Capture, CaptureType } from '@/types/capture'
import { Ic } from '@/components/icons'

type IcKey = keyof typeof Ic
const TYPE_ICON_MAP: Record<CaptureType, IcKey> = {
  photo: 'photo',
  voice: 'voice',
  note: 'note',
  collection: 'collection',
  rule: 'rule',
  feeling: 'feeling',
  reaction: 'reaction',
}

const TYPE_BG: Record<CaptureType, string> = {
  photo:      '#E8C870',
  voice:      '#C0DDE4',
  note:       '#E8E0D0',
  collection: '#C8D8E8',
  rule:       '#CCE0C0',
  feeling:    '#DCC898',
  reaction:   '#E8D0EC',
}

interface LibraryCardProps {
  capture: Capture
  selected?: boolean
  bulkMode?: boolean
  onClick: (capture: Capture) => void
  onLongPress: (capture: Capture) => void
}

export function LibraryCard({
  capture,
  selected = false,
  bulkMode = false,
  onClick,
  onLongPress,
}: LibraryCardProps) {
  const Icon = Ic[TYPE_ICON_MAP[capture.type]]
  const isPhoto = capture.type === 'photo' && !!capture.media_url

  function handlePointerDown(e: React.PointerEvent) {
    const startX = e.clientX
    const startY = e.clientY
    let fired = false

    const timer = setTimeout(() => {
      fired = true
      onLongPress(capture)
    }, 600)

    function handleMove(ev: PointerEvent) {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(timer)
        cleanup()
      }
    }

    function handleUp() {
      clearTimeout(timer)
      cleanup()
    }

    function cleanup() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)

    // Store fired ref for click handler
    ;(e.currentTarget as HTMLElement).dataset.longpressFired = 'false'
    const origTimer = timer
    setTimeout(() => {
      if (fired) {
        ;(document.activeElement as HTMLElement | null)?.blur?.()
      }
    }, 610)
  }

  function handleClick(e: React.MouseEvent) {
    // If we detect a long press fired recently, skip the click
    // We use a data attribute set on pointerdown to track this
    onClick(capture)
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      style={{
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        border: selected
          ? '2px solid var(--violet)'
          : '2px solid transparent',
        background: isPhoto ? '#000' : TYPE_BG[capture.type],
        minHeight: isPhoto ? '120px' : '100px',
      }}
    >
      {isPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={capture.media_url!}
          alt={capture.content || capture.type}
          style={{ width: '100%', display: 'block', objectFit: 'cover', minHeight: '120px' }}
        />
      ) : (
        <div style={{ padding: '12px', minHeight: '100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Icon width={20} height={20} style={{ opacity: 0.6 }} />
          {capture.content && (
            <p style={{
              margin: 0,
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              lineHeight: 1.4,
              color: 'var(--ink)',
              opacity: 0.8,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
            }}>
              {capture.content}
            </p>
          )}
        </div>
      )}

      {/* Type badge on photos */}
      {isPhoto && (
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '4px',
          padding: '2px 5px',
          fontFamily: 'var(--mono)',
          fontSize: '9px',
          color: '#fff',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {capture.type}
        </div>
      )}

      {/* Verdict badge */}
      {capture.verdict && (
        <div style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: capture.verdict === 'keep' ? '#4CAF50' : '#F44336',
          borderRadius: '4px',
          padding: '2px 5px',
          fontFamily: 'var(--mono)',
          fontSize: '9px',
          color: '#fff',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {capture.verdict}
        </div>
      )}

      {/* Bulk select checkbox */}
      {bulkMode && (
        <div style={{
          position: 'absolute',
          bottom: '6px',
          right: '6px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: `2px solid ${selected ? 'var(--violet)' : 'rgba(0,0,0,0.4)'}`,
          background: selected ? 'var(--violet)' : 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {selected && <Ic.check width={12} height={12} style={{ color: '#fff' }} />}
        </div>
      )}
    </div>
  )
}
