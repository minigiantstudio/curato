export async function triggerAgent(captureId: string): Promise<void> {
  fetch('/api/agent/triage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ captureId }),
  }).catch(err => {
    console.error(`Agent trigger failed for ${captureId}:`, err)
  })
}
