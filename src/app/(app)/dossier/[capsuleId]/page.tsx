'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCapsuleById, updateCapsulePublic } from '@/lib/capsule'
import { getContextWithParent } from '@/lib/contexts'
import { DossierDocument, type DossierTheme } from '@/components/dossier/DossierDocument'
import { Ic } from '@/components/icons'
import type { Capsule } from '@/types/capsule'
import type { Context } from '@/types/context'

interface PageProps {
  params: { capsuleId: string }
}

const THEME_KEY = 'taste_dossier_theme'

export default function DossierScreen({ params }: PageProps) {
  const router = useRouter()
  const { capsuleId } = params

  const [capsule, setCapsule] = useState<Capsule | null>(null)
  const [context, setContext] = useState<Context | null>(null)
  const [parent, setParent] = useState<Context | null>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<DossierTheme>('paper')
  const [isPublic, setIsPublic] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'dark' || saved === 'paper') setTheme(saved)
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const cap = await getCapsuleById(capsuleId)
        if (!cap) return
        setCapsule(cap)
        setIsPublic(cap.is_public ?? false)
        if (cap.context_id) {
          const { context: ctx, parent: par } = await getContextWithParent(cap.context_id)
          setContext(ctx)
          setParent(par)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [capsuleId])

  const handleThemeToggle = useCallback(() => {
    setTheme(t => {
      const next: DossierTheme = t === 'paper' ? 'dark' : 'paper'
      if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  const handlePublicToggle = useCallback(async () => {
    if (!capsule) return
    const next = !isPublic
    setIsPublic(next)
    await updateCapsulePublic(capsule.id, next)
  }, [capsule, isPublic])

  const handleCopyLink = useCallback(async () => {
    if (!capsule) return
    const url = `${window.location.origin}/share/${capsule.id}`
    await navigator.clipboard.writeText(url)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 1800)
  }, [capsule])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--cream)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>Loading…</span>
      </div>
    )
  }

  if (!capsule || !context) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--cream)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>Capsule not found</span>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', position: 'relative' }}>
      {/* ── Toolbar ── */}
      <div
        data-no-print
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
          background: 'rgba(243,236,221,0.88)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
        >
          <Ic.back width={22} height={22} style={{ color: 'var(--ink)' }} />
        </button>

        <span style={{ flex: 1, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>
          {context.name} {capsule.version}
        </span>

        {/* Public toggle */}
        <button
          onClick={handlePublicToggle}
          style={{
            padding: '5px 12px', borderRadius: 6,
            background: isPublic ? 'rgba(31,122,80,0.1)' : 'var(--panel)',
            border: `1px solid ${isPublic ? 'var(--green)' : 'var(--line)'}`,
            color: isPublic ? 'var(--green)' : 'var(--ink-faint)',
            fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer',
            letterSpacing: '0.06em',
          }}
        >
          {isPublic ? 'Public' : 'Private'}
        </button>

        {/* Copy link — only when public */}
        {isPublic && (
          <button
            onClick={handleCopyLink}
            style={{
              padding: '5px 12px', borderRadius: 6,
              background: copyFeedback ? 'rgba(31,122,80,0.1)' : 'var(--panel)',
              border: `1px solid ${copyFeedback ? 'var(--green)' : 'var(--line)'}`,
              color: copyFeedback ? 'var(--green)' : 'var(--ink-faint)',
              fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer',
            }}
          >
            {copyFeedback ? '✓ Copied' : 'Copy link'}
          </button>
        )}
      </div>

      {/* Dossier — padded below toolbar */}
      <div style={{ paddingTop: 48 }}>
        <DossierDocument
          capsule={capsule}
          context={context}
          parent={parent}
          theme={theme}
          isOwner={true}
          onThemeToggle={handleThemeToggle}
          onExportPDF={handleExportPDF}
        />
      </div>
    </div>
  )
}
