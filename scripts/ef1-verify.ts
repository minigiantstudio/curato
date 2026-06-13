import { processCapsuleData } from '@/lib/guidelines/process'
import type { RawCapsuleData } from '@/types/guidelines'

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1) }
}

const fixture: RawCapsuleData = {
  capsule: {
    id: 'cap-1', context_id: 'ctx-1', version: 'v1.2', title: 'Plural Café v1.2',
    declaration: 'Warmth earned through material reality.',
    rules: [
      { verb: 'ALWAYS', domain: 'Color', text: 'warm neutral base' },
      { verb: 'never', domain: 'Type', text: 'no centered body text' },
      { verb: 'PREFER', domain: 'Spatial', text: 'negative space' },
      { verb: 'BOGUS', domain: 'X', text: 'ignored' },
    ],
    frequency_map: { warmth: 0.9, restraint: 0.6 },
    created_at: '2026-06-01T00:00:00Z',
  },
  context: { id: 'ctx-1', name: 'Plural Café', type: 'brand', description: 'A café brand.', parent_context_id: null },
  parentContext: null,
  contextNames: { 'ctx-1': 'Plural Café' },
  captures: [
    { id: 'e1', type: 'photo', content: 'warm tiles', verdict: 'keep', media_url: 'u/photos/1.jpg', tags: ['warmth', 'material'], domains: ['Color'], rule_verb: null, context_ids: ['ctx-1'], created_at: '2026-06-01T10:00:00Z' },
    { id: 'e2', type: 'photo', content: 'cold sign', verdict: 'reject', media_url: 'u/photos/2.jpg', tags: ['cold', 'slop'], domains: ['Color'], rule_verb: null, context_ids: ['ctx-1'], created_at: '2026-06-02T10:00:00Z' },
    { id: 'e3', type: 'feeling', content: 'drawn-in — the light pools', verdict: null, media_url: null, tags: [], domains: ['Spatial'], rule_verb: null, context_ids: ['ctx-1'], created_at: '2026-06-02T11:00:00Z' },
    { id: 'e4', type: 'collection', content: 'Mood board\nsecond line', verdict: null, media_url: null, tags: [], domains: [], rule_verb: null, context_ids: ['ctx-1'], created_at: '2026-06-03T10:00:00Z' },
  ],
}

const intel = processCapsuleData(fixture)

assert(intel.meta.designerName === 'Plural Café', 'designerName falls back to context.name')
assert(intel.meta.totalEntries === 2, 'totalEntries counts only verdict captures (keep+reject)')
assert(intel.meta.trainingDays === 3, 'trainingDays = distinct calendar days')
assert(intel.rules.always.length === 1 && intel.rules.never.length === 1 && intel.rules.prefer.length === 1, 'verbs grouped, lowercase normalized')
assert(intel.rules.avoid.length === 0, 'BOGUS verb is dropped')
assert(intel.aestheticProfile.antiSlopScore === 50, 'antiSlopScore = round(100*1/2)')
assert(intel.aestheticProfile.approvedTags.some(t => t.tag === 'warmth'), 'approved tags aggregated')
assert(intel.aestheticProfile.rejectedTags.some(t => t.tag === 'slop'), 'rejected tags aggregated')
assert(intel.feelings.topMoods[0] === 'drawn-in', 'feeling mood parsed from content prefix')
assert(intel.contextMap.Color.approved === 1 && intel.contextMap.Color.rejected === 1, 'contextMap keyed by domain')
assert(intel.references.topImages.length === 2, 'topImages from photo media_url paths')
assert(intel.references.collections[0].name === 'Mood board', 'collection name = first content line')
assert(intel._unavailable.includes('feeling.intensity'), 'unavailable provenance recorded')

console.log('ef1-verify: processor OK')
