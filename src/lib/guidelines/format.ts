import type {
  CapsuleIntelligence, CapsuleIntelligenceJSON, ProcessedRule,
} from '@/types/guidelines'

const SPEC_SCHEMA = 'https://taste.app/schemas/open-capsule-spec.json'
const SPEC_VERSION = '1.0'

function ruleLines(rules: ProcessedRule[]): string[] {
  return rules.map(r => (r.domain ? `- (${r.domain}) ${r.statement}` : `- ${r.statement}`))
}

/** STEP 3a — Markdown (human + agent readable). */
export function formatAsMarkdown(intel: CapsuleIntelligence): string {
  const m = intel.meta
  const lines: string[] = []
  lines.push(`# ${m.title} — AI Guidelines`)
  lines.push('')
  lines.push(`> ${m.declaration}`)
  lines.push('')
  lines.push(`**Designer:** ${m.designerName}  `)
  lines.push(`**Version:** ${m.version}  `)
  lines.push(`**Trained:** ${m.trainingDays} days · ${m.totalEntries} judged entries  `)
  const slop = intel.aestheticProfile.antiSlopScore
  lines.push(`**Selectivity (anti-slop):** ${slop === null ? 'n/a' : `${slop}/100`}`)
  lines.push('')

  lines.push('## Aesthetic profile')
  lines.push(`**Approved signals:** ${intel.aestheticProfile.approvedTags.map(t => `${t.tag} (${t.count})`).join(', ') || '—'}`)
  lines.push('')
  lines.push(`**Rejected patterns:** ${intel.aestheticProfile.rejectedTags.map(t => `${t.tag} (${t.count})`).join(', ') || '—'}`)
  lines.push('')
  lines.push(`**Mood profile:** ${intel.aestheticProfile.moodProfile.join(', ') || '—'}`)
  lines.push('')

  lines.push('## Rules')
  for (const [label, rules] of [
    ['ALWAYS', intel.rules.always], ['NEVER', intel.rules.never],
    ['PREFER', intel.rules.prefer], ['AVOID', intel.rules.avoid],
  ] as const) {
    lines.push(`### ${label}`)
    lines.push(rules.length ? ruleLines(rules).join('\n') : '- —')
    lines.push('')
  }

  lines.push('## Feelings')
  lines.push(intel.feelings.descriptions.length ? intel.feelings.descriptions.map(d => `- ${d}`).join('\n') : '- —')
  lines.push('')

  lines.push('## Domain map')
  const domainRows = Object.entries(intel.contextMap)
  lines.push('| Domain | Approved | Rejected | Rules |')
  lines.push('| --- | --- | --- | --- |')
  for (const [d, v] of domainRows) lines.push(`| ${d} | ${v.approved} | ${v.rejected} | ${v.rules} |`)
  if (!domainRows.length) lines.push('| — | 0 | 0 | 0 |')
  lines.push('')

  lines.push('## Rejection log')
  lines.push(intel.rejectionLog.representativeReasons.length
    ? intel.rejectionLog.representativeReasons.map(r => `- ${r}`).join('\n')
    : '- —')
  lines.push('')

  if (intel.references.collections.length) {
    lines.push('## Collections')
    lines.push(intel.references.collections.map(c => `- ${c.name}`).join('\n'))
    lines.push('')
  }
  if (intel.references.topImages.length) {
    lines.push('## Reference images')
    lines.push(intel.references.topImages.map(i => `- ${i.id} (${i.tags.join(', ') || 'untagged'})`).join('\n'))
    lines.push('')
  }

  lines.push('---')
  lines.push(`_Generated from Taste capsule ${m.capsuleId}. Unavailable fields: ${intel._unavailable.join(', ')}._`)
  return lines.join('\n')
}

/** STEP 3b — Plain text for copy-paste. */
export function formatAsText(intel: CapsuleIntelligence): string {
  const m = intel.meta
  const out: string[] = []
  const rule = (s: string) => out.push(s)
  rule(`${m.title} — AI GUIDELINES`)
  rule('='.repeat(48))
  rule(m.declaration)
  rule('')
  rule(`Designer: ${m.designerName}`)
  rule(`Version: ${m.version}`)
  rule(`Trained: ${m.trainingDays} days, ${m.totalEntries} judged entries`)
  const slop = intel.aestheticProfile.antiSlopScore
  rule(`Selectivity: ${slop === null ? 'n/a' : `${slop}/100`}`)
  rule('')
  rule('APPROVED SIGNALS: ' + (intel.aestheticProfile.approvedTags.map(t => `${t.tag} (${t.count})`).join(', ') || '-'))
  rule('REJECTED PATTERNS: ' + (intel.aestheticProfile.rejectedTags.map(t => `${t.tag} (${t.count})`).join(', ') || '-'))
  rule('MOOD: ' + (intel.aestheticProfile.moodProfile.join(', ') || '-'))
  rule('')
  for (const [label, rules] of [
    ['ALWAYS', intel.rules.always], ['NEVER', intel.rules.never],
    ['PREFER', intel.rules.prefer], ['AVOID', intel.rules.avoid],
  ] as const) {
    rule(`${label}:`)
    if (rules.length) for (const r of rules) rule(`  - ${r.domain ? `(${r.domain}) ` : ''}${r.statement}`)
    else rule('  - -')
  }
  rule('')
  rule('FEELINGS:')
  if (intel.feelings.descriptions.length) for (const d of intel.feelings.descriptions) rule(`  - ${d}`)
  else rule('  - -')
  rule('')
  rule('REJECTION LOG:')
  if (intel.rejectionLog.representativeReasons.length) for (const r of intel.rejectionLog.representativeReasons) rule(`  - ${r}`)
  else rule('  - -')
  rule('')
  rule(`(Unavailable: ${intel._unavailable.join(', ')})`)
  return out.join('\n')
}

/** STEP 3c — Open-Capsule-Spec JSON object (machine readable). */
export function formatAsJSON(intel: CapsuleIntelligence): CapsuleIntelligenceJSON {
  return {
    $schema: SPEC_SCHEMA,
    specVersion: SPEC_VERSION,
    generatedAt: new Date().toISOString(),
    ...intel,
  }
}
