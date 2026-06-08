import { createServerSupabaseClient } from '@/lib/supabase-server'
import { analyzeCapture } from '@/lib/claude'
import type { AgentResponse } from '@/types/agent'
import type { CaptureType } from '@/types/capture'

export async function triggerAgent(captureId: string): Promise<void> {
  // Fire-and-forget: don't await this, don't block the UI
  processCapture(captureId).catch(err => {
    console.error(`Agent error for capture ${captureId}:`, err)
  })
}

async function processCapture(captureId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Fetch the capture
  const { data: capture, error: captureError } = await supabase
    .from('captures')
    .select('*')
    .eq('id', captureId)
    .eq('user_id', user.id)
    .single()

  if (captureError || !capture) {
    console.error('Capture not found:', captureError)
    return
  }

  // Fetch existing tags and contexts
  const { data: allCaptures } = await supabase
    .from('captures')
    .select('tags')
    .eq('user_id', user.id)
    .not('tags', 'eq', '{}')
    .limit(100)

  const existingTags = Array.from(
    new Set((allCaptures ?? []).flatMap((c: { tags: string[] }) => c.tags ?? []))
  ).sort()

  const { data: contexts } = await supabase
    .from('contexts')
    .select('id, name, description, type')
    .eq('user_id', user.id)
    .eq('archived', false)

  // Call Claude
  let analysisResult: AgentResponse
  try {
    analysisResult = await analyzeCapture(
      capture.type as CaptureType,
      capture.content,
      existingTags,
      contexts ?? []
    )
  } catch (err) {
    console.error('Claude analysis failed:', err)
    return
  }

  // Store results in the capture record
  const { error: updateError } = await supabase
    .from('captures')
    .update({
      ai_tags: analysisResult.suggested_tags ?? [],
      ai_domains: analysisResult.suggested_domains ?? [],
      ai_suggested_contexts: analysisResult.suggested_context_ids ?? [],
      ai_processed: true,
    })
    .eq('id', captureId)
    .eq('user_id', user.id)

  if (updateError) {
    console.error('Failed to store agent results:', updateError)
  }
}
