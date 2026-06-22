import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { analyzeCapture } from '@/lib/claude'
import type { CaptureType } from '@/types/capture'

export async function POST(req: NextRequest) {
  const authed = await createServerSupabaseClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { captureId } = await req.json() as { captureId?: string }
  if (!captureId) return NextResponse.json({ error: 'captureId required' }, { status: 400 })

  const { data: capture } = await authed
    .from('captures')
    .select('type, content, ai_processed')
    .eq('id', captureId)
    .eq('user_id', user.id)
    .single()

  if (!capture || capture.ai_processed) return NextResponse.json({ ok: true })

  const { data: allCaptures } = await authed
    .from('captures')
    .select('tags, ai_tags')
    .eq('user_id', user.id)
    .limit(100)

  const existingTags = Array.from(
    new Set(
      (allCaptures ?? []).flatMap((c: { tags: string[]; ai_tags: string[] }) => [
        ...(c.tags ?? []),
        ...(c.ai_tags ?? []),
      ])
    )
  ).sort()

  const { data: contexts } = await authed
    .from('contexts')
    .select('id, name, description, type')
    .eq('user_id', user.id)
    .eq('archived', false)

  let result
  try {
    result = await analyzeCapture(
      capture.type as CaptureType,
      capture.content as string,
      existingTags,
      contexts ?? []
    )
  } catch (err) {
    console.error('agent/triage: Claude failed:', err)
    return NextResponse.json({ ok: true })
  }

  await authed
    .from('captures')
    .update({
      ai_tags: result.suggested_tags ?? [],
      ai_domains: result.suggested_domains ?? [],
      ai_suggested_contexts: result.suggested_context_ids ?? [],
      ai_processed: true,
    })
    .eq('id', captureId)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
