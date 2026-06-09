// src/components/dossier/PublicDossierClient.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { DossierDocument, type DossierTheme } from './DossierDocument'
import type { Capsule } from '@/types/capsule'
import type { Context } from '@/types/context'

const THEME_KEY = 'taste_dossier_theme'

interface Props {
  capsule: Capsule
  context: Context
  parent: Context | null
}

export function PublicDossierClient({ capsule, context, parent }: Props) {
  const [theme, setTheme] = useState<DossierTheme>('paper')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'dark' || saved === 'paper') setTheme(saved)
    }
  }, [])

  const handleThemeToggle = useCallback(() => {
    setTheme(t => {
      const next: DossierTheme = t === 'paper' ? 'dark' : 'paper'
      if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  return (
    <DossierDocument
      capsule={capsule}
      context={context}
      parent={parent}
      theme={theme}
      isOwner={false}
      onThemeToggle={handleThemeToggle}
      onExportPDF={() => window.print()}
    />
  )
}
