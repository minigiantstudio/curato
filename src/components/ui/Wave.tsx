'use client'

const HEIGHTS = [24, 36, 28, 36, 20, 32, 28, 36, 24, 32, 20, 28, 36, 24]
const ANIMS = ['wave-a', 'wave-b', 'wave-c', 'wave-d', 'wave-b', 'wave-a', 'wave-c',
               'wave-d', 'wave-a', 'wave-b', 'wave-d', 'wave-c', 'wave-a', 'wave-b']

interface WaveProps {
  active?: boolean
  color?: string
}

export function Wave({ active = false, color = 'var(--violet)' }: WaveProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 36 }}>
      {HEIGHTS.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: h,
            borderRadius: 2,
            background: color,
            transformOrigin: 'bottom',
            animation: active
              ? `${ANIMS[i % ANIMS.length]} ${0.5 + (i % 5) * 0.08}s ${(i * 0.03).toFixed(2)}s ease-in-out infinite`
              : 'none',
            transform: active ? undefined : 'scaleY(0.2)',
            transition: active ? undefined : 'transform 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}
