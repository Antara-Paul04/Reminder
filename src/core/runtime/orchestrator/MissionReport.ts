import type { LoopPolicy } from './LoopPolicy'

export type MissionOutcome = 'completed' | 'halted' | 'cancelled' | 'awaiting-approval'

/** Everything a settled mission leaves behind — serializable, exportable. */
export interface MissionReportData {
  missionId: string
  projectId: string
  title: string
  brief: string
  outcome: MissionOutcome
  outcomeReason: string
  iterations: number
  durationMs: number
  qualityScore: number | null
  policy: LoopPolicy | null
  artifacts: { name: string; kind: string; createdBy: string }[]
  finalScreenshots: string[]
  filesGenerated: string[]
  revisionPlans: number
  timeline: { at: number; message: string; actor: string }[]
  reviewHistory: { message: string; at: number }[]
  lessonsLearned: string[]
  generatedAt: number
}

export function renderReportMarkdown(data: MissionReportData): string {
  const minutes = Math.round(data.durationMs / 6000) / 10
  const list = (items: string[], empty: string) =>
    items.length > 0 ? items.map((i) => `- ${i}`).join('\n') : `_${empty}_`

  return `# Mission Report — ${data.title}

**Outcome:** ${data.outcome} — ${data.outcomeReason}
**Iterations:** ${data.iterations} · **Duration:** ${minutes}m · **Quality:** ${data.qualityScore !== null ? `${data.qualityScore}/10` : 'n/a'}

## Mission Summary
${data.brief || '_No brief provided._'}

## Artifacts (${data.artifacts.length})
${list(data.artifacts.map((a) => `\`${a.name}\` (${a.kind}) — ${a.createdBy}`), 'none')}

## Final Screenshots
${list(data.finalScreenshots, 'none captured')}

## Files Generated
${list(data.filesGenerated, 'none')}

## Review History
${list(data.reviewHistory.map((r) => r.message), 'no reviews recorded')}

## Lessons Learned
${list(data.lessonsLearned, 'nothing flagged — clean run')}

## Timeline
${data.timeline.map((t) => `- ${new Date(t.at).toLocaleTimeString()} · ${t.actor} — ${t.message}`).join('\n')}
`
}

export function renderReportJson(data: MissionReportData): string {
  return JSON.stringify(data, null, 2)
}

/** Lessons = every rejection reason + revision-plan headline, deduplicated. */
export function deriveLessons(inputs: {
  rejectionReasons: string[]
  revisionPlanCount: number
  iterations: number
}): string[] {
  const lessons = [...new Set(inputs.rejectionReasons)].map(
    (reason) => `Needed rework: ${reason}`
  )
  if (inputs.iterations > 1) {
    lessons.push(
      `Took ${inputs.iterations} iterations — consider a more specific creative spec next time`
    )
  }
  return lessons
}
