'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function CapsuleIndexPage() {
  const router = useRouter()
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    async function redirect() {
      const supabase = createClient()
      const { data } = await supabase
        .from('capsules')
        .select('context_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data?.context_id) {
        router.replace(`/capsule/${data.context_id}`)
      } else {
        setEmpty(true)
      }
    }
    redirect()
  }, [router])

  if (empty) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--cream)', padding: '40px 24px', textAlign: 'center',
      }}>
        <span style={{ fontSize: 36, color: 'rgba(74,61,176,0.25)', display: 'block', marginBottom: 20 }}>◇</span>
        <p style={{
          fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400,
          color: 'var(--ink)', margin: '0 0 8px', letterSpacing: '-0.01em',
        }}>
          No capsule yet
        </p>
        <p style={{
          fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-faint)',
          margin: '0 0 28px', lineHeight: 1.5, maxWidth: 280,
        }}>
          Create a brand, add captures, then generate your first capsule.
        </p>
        <button
          onClick={() => router.push('/contexts')}
          style={{
            padding: '0 24px', height: 48,
            background: 'var(--violet)', color: '#fff',
            border: 'none', borderRadius: 8,
            fontFamily: 'var(--mono)', fontSize: 13,
            letterSpacing: '0.04em', cursor: 'pointer',
          }}
        >
          Go to Brands →
        </button>
      </div>
    )
  }

  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cream)',
    }}>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)',
        letterSpacing: '0.04em',
      }}>
        Loading…
      </span>
    </div>
  )
}
