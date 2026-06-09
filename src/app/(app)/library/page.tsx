'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { searchCaptures, bulkAssignContext, deleteCapture } from '@/lib/captures'
import type { LibraryFilters } from '@/lib/captures'
import { getContexts } from '@/lib/contexts'
import { SearchBar } from '@/components/library/SearchBar'
import { FilterBar } from '@/components/library/FilterBar'
import { LibraryCard } from '@/components/library/LibraryCard'
import { CaptureDetail } from '@/components/capture/CaptureDetail'
import { AssignContextSheet } from '@/components/contexts/AssignContextSheet'
import type { Capture } from '@/types/capture'
import type { Context } from '@/types/context'

const EMPTY_FILTERS: LibraryFilters = {
  query: '',
  types: [],
  domains: [],
  verdict: null,
  contextId: null,
  hasMedia: null,
  dateRange: null,
}

export default function LibraryPage() {
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_FILTERS)
  const [captures, setCaptures] = useState<Capture[]>([])
  const [contexts, setContexts] = useState<Context[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Capture detail sheet
  const [detailCapture, setDetailCapture] = useState<Capture | null>(null)

  // Bulk select mode
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)
  // Track current filters+page in a ref to avoid stale closures in IntersectionObserver
  const stateRef = useRef({ filters, page, hasMore, loadingMore })
  useEffect(() => {
    stateRef.current = { filters, page, hasMore, loadingMore }
  }, [filters, page, hasMore, loadingMore])

  // Load contexts once on mount
  useEffect(() => {
    getContexts().then(setContexts)
  }, [])

  // Load/reload captures when filters change
  const loadCaptures = useCallback(async (f: LibraryFilters, p: number, append: boolean) => {
    if (!append) setLoading(true)
    else setLoadingMore(true)

    const results = await searchCaptures(f, p)

    if (append) {
      setCaptures(prev => [...prev, ...results])
    } else {
      setCaptures(results)
    }
    setHasMore(results.length === 20)

    if (!append) setLoading(false)
    else setLoadingMore(false)
  }, [])

  useEffect(() => {
    setPage(0)
    setHasMore(true)
    loadCaptures(filters, 0, false)
  }, [filters, loadCaptures])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return
      const { hasMore, loadingMore, filters, page } = stateRef.current
      if (!hasMore || loadingMore) return
      const nextPage = page + 1
      setPage(nextPage)
      loadCaptures(filters, nextPage, true)
    }, { threshold: 0.1 })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadCaptures])

  function handleLongPress(capture: Capture) {
    if (!bulkMode) {
      setBulkMode(true)
      setSelected(new Set([capture.id]))
    }
  }

  function handleCardClick(capture: Capture) {
    if (bulkMode) {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(capture.id)) next.delete(capture.id)
        else next.add(capture.id)
        return next
      })
    } else {
      setDetailCapture(capture)
    }
  }

  function exitBulkMode() {
    setBulkMode(false)
    setSelected(new Set())
  }

  async function handleBulkDelete() {
    if (bulkDeleting || selected.size === 0) return
    setBulkDeleting(true)
    const ids = Array.from(selected)
    await Promise.all(ids.map(id => deleteCapture(id)))
    const idsSet = new Set(ids)
    setCaptures(prev => prev.filter(c => !idsSet.has(c.id)))
    setBulkDeleting(false)
    exitBulkMode()
  }

  // First selected capture used as proxy to open AssignContextSheet
  const bulkProxyCapture = bulkAssignOpen
    ? (captures.find(c => c.id === Array.from(selected)[0]) ?? null)
    : null

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--cream)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0', flexShrink: 0 }}>
        <h1 style={{ margin: '0 0 4px', fontFamily: 'var(--display)', fontSize: '28px', color: 'var(--ink)' }}>
          Library
        </h1>
        <p style={{ margin: '0 0 12px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--stone)' }}>
          {loading ? 'Loading…' : `${captures.length}${hasMore ? '+' : ''} captures`}
        </p>
      </div>

      {/* Search */}
      <SearchBar
        value={filters.query}
        onSearch={q => setFilters(f => ({ ...f, query: q }))}
      />

      {/* Filters */}
      <FilterBar
        filters={filters}
        contexts={contexts}
        onChange={setFilters}
      />

      {/* Masonry grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: '12px',
            color: 'var(--stone)',
            textAlign: 'center',
            paddingTop: '40px',
          }}>
            Loading…
          </p>
        ) : captures.length === 0 ? (
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: '12px',
            color: 'var(--stone)',
            textAlign: 'center',
            paddingTop: '40px',
          }}>
            No captures found
          </p>
        ) : (
          <div style={{ columns: 2, columnGap: '8px' }}>
            {captures.map(capture => (
              <div key={capture.id} style={{ breakInside: 'avoid', marginBottom: '8px' }}>
                <LibraryCard
                  capture={capture}
                  selected={selected.has(capture.id)}
                  bulkMode={bulkMode}
                  onClick={handleCardClick}
                  onLongPress={handleLongPress}
                />
              </div>
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: '20px' }} />
        {loadingMore && (
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--stone)',
            textAlign: 'center',
            paddingBottom: '16px',
          }}>
            Loading more…
          </p>
        )}
      </div>

      {/* Bulk action bar */}
      {bulkMode && (
        <div style={{
          position: 'fixed',
          bottom: '52px',
          left: 0,
          right: 0,
          background: 'var(--ink)',
          padding: '12px 16px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          zIndex: 50,
        }}>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--cream)',
            flexShrink: 0,
          }}>
            {selected.size} selected
          </span>
          <div style={{ display: 'flex', gap: '6px', flex: 1, overflowX: 'auto' }}>
            <button
              onClick={() => setBulkAssignOpen(true)}
              disabled={selected.size === 0}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'transparent',
                color: 'var(--cream)',
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                opacity: selected.size === 0 ? 0.4 : 1,
              }}
            >
              Assign context
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selected.size === 0 || bulkDeleting}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid rgba(244,67,54,0.6)',
                background: 'transparent',
                color: '#F44336',
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                cursor: (selected.size === 0 || bulkDeleting) ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                opacity: (selected.size === 0 || bulkDeleting) ? 0.4 : 1,
              }}
            >
              {bulkDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
          <button
            onClick={exitBulkMode}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--cream)',
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              cursor: 'pointer',
              opacity: 0.7,
              flexShrink: 0,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Capture detail sheet */}
      <CaptureDetail
        capture={detailCapture}
        contexts={contexts}
        open={detailCapture !== null}
        onClose={() => setDetailCapture(null)}
        onDeleted={id => {
          setCaptures(prev => prev.filter(c => c.id !== id))
          setDetailCapture(null)
        }}
        onUpdated={updated => {
          setCaptures(prev => prev.map(c => c.id === updated.id ? updated : c))
          setDetailCapture(updated)
        }}
      />

      {/* Bulk assign context sheet */}
      <AssignContextSheet
        open={bulkAssignOpen}
        capture={bulkProxyCapture}
        onClose={() => setBulkAssignOpen(false)}
        onSaved={async (_captureId, contextIds) => {
          if (contextIds.length > 0) {
            await Promise.all(
              contextIds.map(cid => bulkAssignContext(Array.from(selected), cid))
            )
          }
          setBulkAssignOpen(false)
          exitBulkMode()
        }}
      />
    </div>
  )
}
