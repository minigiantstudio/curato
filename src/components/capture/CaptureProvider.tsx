'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TypeSheet } from './TypeSheet'
import { CaptureScreen } from './CaptureScreen'
import { ContextStep, type ContextData } from './ContextStep'
import { DoneScreen, type SavedEntry } from './DoneScreen'
import { saveCapture, saveCaptureWithMedia, flushOfflineQueue } from '@/lib/captures'
import { getOrCreateAnonSession } from '@/lib/auth'
import { triggerAgent } from '@/lib/agent'
import type { CaptureType, Verdict, RuleVerb, CaptureInsert } from '@/types/capture'
import { FocusContextStep, type FocusContextData } from './FocusContextStep'
import { useFocus } from '@/components/focus'
import type { Context } from '@/types/context'

// ── State machine ─────────────────────────────────────────────
type FlowStep = 'idle' | 'typeSheet' | 'capture' | 'context' | 'done'

interface FlowData {
  type?: CaptureType
  content?: string
  mediaFile?: File
  ruleVerb?: RuleVerb
  ruleDomain?: string
  verdict?: Verdict
}

// ── Context ───────────────────────────────────────────────────
interface CaptureContextValue {
  openCapture: () => void
}

const CaptureContext = createContext<CaptureContextValue>({ openCapture: () => {} })

export function useCaptureContext() {
  return useContext(CaptureContext)
}

// ── Provider ──────────────────────────────────────────────────
export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { focusedBrand } = useFocus()
  const [step, setStep] = useState<FlowStep>('idle')
  const [savedEntry, setSavedEntry] = useState<SavedEntry | null>(null)
  const flowData = useRef<FlowData>({})

  // Exposed to children via context
  const openCapture = useCallback(() => {
    flowData.current = {}
    setSavedEntry(null)
    setStep('typeSheet')
  }, [])

  // ── TypeSheet → CaptureScreen ────────────────────────────────
  function onTypeSelect(type: CaptureType) {
    flowData.current.type = type
    setStep('capture')
  }

  // ── CaptureScreen → ContextStep (or Done for reactions) ──────
  function onCaptureNext(data: { content: string; mediaFile?: File; ruleVerb?: RuleVerb; ruleDomain?: string; verdict?: Verdict }) {
    flowData.current = { ...flowData.current, ...data }
    const { type, verdict } = flowData.current

    // Reaction with verdict: skip context step, save immediately
    if (type === 'reaction' && verdict != null) {
      void persistAndDone()
      return
    }
    setStep('context')
  }

  // ── ContextStep → Done ────────────────────────────────────────
  async function onContextDone(ctx: ContextData) {
    flowData.current.verdict = (ctx.verdict === 'pending' ? null : ctx.verdict) as Verdict ?? flowData.current.verdict
    await persistAndDone(ctx)
  }

  // ── Persist + transition to done ─────────────────────────────
  async function persistAndDone(ctx?: ContextData) {
    const { type, content, ruleVerb, verdict, mediaFile } = flowData.current

    // Ensure anon session exists (best-effort; saveCapture handles offline)
    try { await getOrCreateAnonSession() } catch { /* offline — queue will handle */ }
    await flushOfflineQueue()

    const insert: CaptureInsert = {
      type: type!,
      content: content ?? '',
      verdict: verdict ?? null,
      rule_verb: ruleVerb,
      tags: ctx?.tags,
      domains: ctx?.domain ? [ctx.domain] : undefined,
      // Attach the focused brand when in focus mode (e.g. the reaction fast-path
      // that skips the context step); empty otherwise.
      context_ids: focusedBrand ? [focusedBrand.id] : [],
    }

    // Upload photo if present, otherwise plain save
    const saved = mediaFile
      ? await saveCaptureWithMedia(insert, mediaFile, 'photos')
      : await saveCapture(insert)

    if (saved) {
      void triggerAgent(saved.id)
    }
    setSavedEntry({ type: type!, content: content ?? '', verdict: verdict ?? null, domain: ctx?.domain ?? '', tags: ctx?.tags ?? [] })
    setStep('done')
  }

  // ── Focus mode: persist capture + optional linked rule ───────
  async function persistFocusAndDone(data: FocusContextData, brand: Context) {
    const { type, mediaFile } = flowData.current

    let session = null
    try { session = await getOrCreateAnonSession() } catch { /* offline */ }
    await flushOfflineQueue()

    // Primary capture row — tagged to the focused brand
    const primary: CaptureInsert = {
      type: type!,
      content: data.take,
      verdict: data.verdict,
      domains: data.domain ? [data.domain] : undefined,
      context_ids: [brand.id],
    }
    const saved = mediaFile
      ? await saveCaptureWithMedia(primary, mediaFile, 'photos')
      : await saveCapture(primary)

    // Optional rule row. This is an independent capture (a standalone rule tagged
    // to the same brand), not a child of the primary row — so it is saved regardless
    // of whether the primary save succeeded or was queued offline; both flush later.
    if (data.rule) {
      const ruleInsert: CaptureInsert = {
        type: 'rule',
        content: data.rule.text,
        rule_verb: data.rule.verb,
        domains: data.domain ? [data.domain] : undefined,
        context_ids: [brand.id],
      }
      await saveCapture(ruleInsert)
    }

    // Agent processes the primary capture only; the rule row is linked context,
    // not a trigger target.
    if (saved) {
      void triggerAgent(saved.id)
    }
    setSavedEntry({
      type: type!,
      content: data.take,
      verdict: data.verdict,
      domain: data.domain ?? '',
      tags: [],
    })
    setStep('done')
  }

  // ── Done screen actions ───────────────────────────────────────
  function onAgain() {
    flowData.current = {}
    setSavedEntry(null)
    setStep('typeSheet')
  }

  function onFeed() {
    flowData.current = {}
    setSavedEntry(null)
    setStep('idle')
    router.push('/feed')
  }

  // ── Render ────────────────────────────────────────────────────
  const type = flowData.current.type

  return (
    <CaptureContext.Provider value={{ openCapture }}>
      {children}

      {/* TypeSheet — bottom sheet overlay */}
      {step === 'typeSheet' && (
        <TypeSheet
          onClose={() => setStep('idle')}
          onSelect={onTypeSelect}
        />
      )}

      {/* Full-screen capture flow — rendered as fixed overlay */}
      {(step === 'capture' || step === 'context' || step === 'done') && type && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'var(--cream)',
            zIndex: 50,
            display: 'flex', flexDirection: 'column',
          }}
        >
          {step === 'capture' && (
            <CaptureScreen
              type={type}
              onBack={() => setStep('typeSheet')}
              onNext={onCaptureNext}
            />
          )}
          {step === 'context' && focusedBrand && (
            <FocusContextStep
              brand={focusedBrand}
              type={type}
              content={flowData.current.content ?? ''}
              onBack={() => setStep('capture')}
              onDone={data => { void persistFocusAndDone(data, focusedBrand) }}
            />
          )}
          {step === 'context' && !focusedBrand && (
            <ContextStep
              type={type}
              content={flowData.current.content ?? ''}
              onBack={() => setStep('capture')}
              onDone={ctx => { void onContextDone(ctx) }}
            />
          )}
          {step === 'done' && savedEntry && (
            <DoneScreen
              entry={savedEntry}
              onAgain={onAgain}
              onFeed={onFeed}
            />
          )}
        </div>
      )}
    </CaptureContext.Provider>
  )
}
