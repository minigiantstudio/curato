// Standalone runner for fetchCapsuleStats — not imported by the app.
// Run: npx tsx --env-file=.env.local scripts/test-stats.ts <capsuleId>
import { fetchCapsuleStats } from '@/lib/guidelines-generator'

const capsuleId = process.argv[2]
if (!capsuleId) {
  console.error('Usage: npx tsx --env-file=.env.local scripts/test-stats.ts <capsuleId>')
  process.exit(1)
}

fetchCapsuleStats(capsuleId)
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => {
    console.error('Error:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
