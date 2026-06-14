'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [linkError, setLinkError] = useState(false)

  // Already signed in → go straight to the app.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/feed')
    })
    if (new URLSearchParams(window.location.search).get('error') === 'auth') {
      setLinkError(true)
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setLinkError(false)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--cream)', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{
          fontFamily: 'var(--display)', fontSize: 32, fontWeight: 400,
          letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 8,
        }}>
          Taste
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 28, lineHeight: 1.5 }}>
          Sign in with your email. We&apos;ll send you a one-tap sign-in link.
        </p>

        {status === 'sent' ? (
          <div style={{
            padding: '16px 18px', borderRadius: 12, background: 'var(--cream-2)',
            border: '1.5px solid var(--line-soft)',
          }}>
            <p style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 4, fontFamily: 'var(--mono)' }}>
              Check your email
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
              A sign-in link is on its way to {email}. Open it on this device.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@studio.com"
              autoComplete="email"
              required
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 10,
                border: '1.5px solid var(--line-soft)', background: 'var(--cream-2)',
                color: 'var(--ink)', fontSize: 14, marginBottom: 10,
                fontFamily: 'var(--mono)',
              }}
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                background: 'var(--violet)', color: '#fff', fontSize: 13,
                letterSpacing: '0.04em', border: 'none',
                cursor: status === 'sending' ? 'default' : 'pointer',
                opacity: status === 'sending' ? 0.6 : 1,
              }}
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}

        {linkError && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 12 }}>
            That link didn&apos;t work — request a new one.
          </p>
        )}
        {status === 'error' && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 12 }}>
            Couldn&apos;t send the link — check the address and try again.
          </p>
        )}
      </div>
    </div>
  )
}
