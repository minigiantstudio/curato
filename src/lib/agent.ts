import { createClient } from '@/lib/supabase'
import { analyzeCapture } from '@/lib/claude'
import type { AgentResponse } from '@/types/agent'
import type { CaptureType } from '@/types/capture'

export async function triggerAgent(captureId: string, userId: string): Promise<void> {
  // Fire-and-forget: don't await this, don't block the UI
  processCapture(captureId, userId).catch(err => {
    console.error(`Agent error for capture ${captureId}:`, err)
  })
}

async function processCapture(captureId: string, userId: string): Promise<void> {
  const supabase = createClient()

  // Fetch the capture
  const { data: capture, error: captureError } = await supabase
    .from('captures')
    .select('type, content, ai_processed')
    .eq('id', captureId)
    .eq('user_id', userId)
    .single()

  if (captureError || !capture) {
    console.error('Capture not found:', captureError)
    return
  }

  // Idempotency guard
  if (capture.ai_processed) return

  // Fetch existing tags (human + AI) from user's captures
  const { data: allCaptures } = await supabase
    .from('captures')
    .select('tags, ai_tags')
    .eq('user_id', userId)
    .limit(100)

  const existingTags = Array.from(
    new Set(
      (allCaptures ?? []).flatMap((c: { tags: string[]; ai_tags: string[] }) => [
        ...(c.tags ?? []),
        ...(c.ai_tags ?? []),
      ])
    )
  ).sort()

  // Fetch non-archived contexts
  const { data: contexts } = await supabase
    .from('contexts')
    .select('id, name, description, type')
    .eq('user_id', userId)
    .eq('archived', false)

  // Call Claude
  let analysisResult: AgentResponse
  try {
    analysisResult = await analyzeCapture(
      capture.type as CaptureType,
      capture.content as string,
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
    .eq('user_id', userId)

  if (updateError) {
    console.error('Failed to store agent results:', updateError)
  }
}
