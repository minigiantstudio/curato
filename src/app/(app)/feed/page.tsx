'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getInboxCaptures } from '@/lib/captures'
import { useCaptureContext } from '@/components/capture/CaptureProvider'
import { FocusBar } from '@/components/focus'
import { CapsuleWidget } from '@/components/home/CapsuleWidget'
import { StepRail } from '@/components/home/StepRail'
import { ExportSheet } from '@/components/home/ExportSheet'
import { Ic } from '@/components/icons'
import type { CapsuleStats } from '@/lib/guidelines-generator'

interface CapsuleRow {
  id: string
  version: number
  created_at: string
  rules: unknown[]
  context_id: string
}

function headerDate(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `${day} · ${mon} ${d.getDate()}`
}

export default function HomePage() {
  const router = useRouter()
  const { openCapture } = useCaptureContext()
  const [capsule, setCapsule]       = useState<CapsuleRow | null>(null)
  const [stats,   setStats]         = useState<CapsuleStats | null>(null)
  const [todayCount, setTodayCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [inboxCount, setInboxCount] = useState(0)

  useEffect(() => {
    getInboxCaptures().then(items => setInboxCount(items.length))
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()

        const { data: cap } = await supabase
          .from('capsules')
          .select('id, version, created_at, rules, context_id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const [todayRes, totalRes] = await Promise.all([
          supabase
            .from('captures')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString()),
          supabase
            .from('captures')
            .select('*', { count: 'exact', head: true }),
        ])

        setTodayCount(todayRes.count ?? 0)
        setTotalCount(totalRes.count ?? 0)

        if (cap) {
          setCapsule(cap as CapsuleRow)
          try {
            const res = await fetch(`/api/capsule/stats?capsuleId=${cap.id}`)
            if (res.ok) setStats(await res.json() as CapsuleStats)
          } catch {
            // silent
          }
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const trainingDays = stats?.trainingDays ?? 0

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100dvh' }}>
      <FocusBar />

      <div style={{
        maxWidth: 480,
        margin: '0 auto',
        paddingBottom: 96,
        animation: 'fadeUp 0.4s ease both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 20px 8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic.mark s={18} />
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
              letterSpacing: '0.08em', color: 'var(--ink)',
            }}>CURATO</span>
          </div>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--ink-faint)', letterSpacing: '0.04em',
          }}>{headerDate()}</span>
        </div>

        <div style={{ padding: '16px 20px 4px' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--violet)', letterSpacing: '0.06em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            {`Day ${trainingDays} · the eye`}
          </div>
          <h1 style={{
            fontFamily: 'var(--display)', fontSize: 31, fontWeight: 400,
            lineHeight: 1.12, letterSpacing: '-0.015em',
            color: 'var(--ink)', margin: 0,
          }}>
            Your taste is<br />
            becoming{' '}
            <em style={{ color: 'var(--violet)', fontStyle: 'italic' }}>legible.</em>
          </h1>
        </div>

        <div style={{ padding: '20px 20px 0' }}>
          <CapsuleWidget
            capsule={capsule}
            stats={stats}
            loading={loading}
            onClick={capsule?.context_id ? () => router.push(`/capsule/${capsule.context_id}`) : undefined}
          />
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <StepRail
            todayCount={todayCount}
            totalCount={totalCount}
            inboxCount={inboxCount}
            capsuleContextId={capsule?.context_id ?? null}
            capsuleVersion={capsule?.version ?? null}
            onExport={() => setExportOpen(true)}
          />
        </div>
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', height: 56,
        borderTop: '1px solid var(--line-soft)',
        background: 'var(--cream)',
      }}>
        <button
          onClick={openCapture}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--violet)', color: 'var(--cream)',
            fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
            letterSpacing: '0.06em',
            border: 'none', cursor: 'pointer', borderRadius: 0,
          }}
        >
          <span style={{ fontSize: 15 }}>◉</span>
          CAPTURE
        </button>
        <button
          onClick={() => setExportOpen(true)}
          style={{
            width: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--cream-2)',
            border: 'none', borderLeft: '1px solid var(--line-soft)',
            cursor: 'pointer', borderRadius: 0,
            fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--ink)',
          }}
        >
          ↑
        </button>
      </div>

      {exportOpen && (
        <ExportSheet
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          capsuleId={capsule?.id ?? null}
          capsuleVersion={capsule?.version ?? null}
        />
      )}
    </div>
  )
}
