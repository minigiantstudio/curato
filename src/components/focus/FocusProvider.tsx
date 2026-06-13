'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Context } from '@/types/context'

const STORAGE_KEY = 'taste.focusedBrand'

interface FocusContextValue {
  focusedBrand: Context | null
  enterFocus: (brand: Context) => void
  exitFocus: () => void
}

const FocusContext = createContext<FocusContextValue>({
  focusedBrand: null,
  enterFocus: () => {},
  exitFocus: () => {},
})

export function useFocus() {
  return useContext(FocusContext)
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [focusedBrand, setFocusedBrand] = useState<Context | null>(null)

  // Rehydrate from sessionStorage on mount (survives navigation, clears on tab close)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) setFocusedBrand(JSON.parse(raw) as Context)
    } catch {
      /* ignore malformed storage */
    }
  }, [])

  const enterFocus = useCallback((brand: Context) => {
    setFocusedBrand(brand)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(brand))
    } catch {
      /* ignore quota / private mode */
    }
  }, [])

  const exitFocus = useCallback(() => {
    setFocusedBrand(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <FocusContext.Provider value={{ focusedBrand, enterFocus, exitFocus }}>
      {children}
    </FocusContext.Provider>
  )
}
