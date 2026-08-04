import type { Artifact } from '../types'

export interface RevisionItem {
  priority: 'P0' | 'P1' | 'P2'
  problem: string
  reason: string
  suggestedFix: string
  affectedComponents: string[]
  expectedOutcome: string
}

/**
 * Turns QA feedback into a structured revision plan — the ONLY input the
 * Engineer needs for the next iteration. Deterministic today (derived from
 * the rejection reason and qa-report bullets); a future planning provider
 * can generate richer plans into the same artifact contract.
 */
export function buildRevisionPlan(input: {
  missionTitle: string
  iteration: number
  rejectionReason: string
  artifacts: Artifact[]
}): { name: string; kind: 'plan'; description: string; content: string } {
  const report = [...input.artifacts].reverse().find((a) => a.kind === 'qa-report')
  const issues = report ? extractIssues(report.content) : []
  const items: RevisionItem[] = [
    {
      priority: 'P0',
      problem: input.rejectionReason,
      reason: 'Design QA rejected the build for this issue',
      suggestedFix: suggestFix(input.rejectionReason),
      affectedComponents: guessComponents(input.rejectionReason),
      expectedOutcome: 'QA re-review passes this dimension at or above threshold'
    },
    ...issues.slice(0, 4).map(
      (issue, index): RevisionItem => ({
        priority: index === 0 ? 'P1' : 'P2',
        problem: issue,
        reason: 'Raised in the QA report',
        suggestedFix: suggestFix(issue),
        affectedComponents: guessComponents(issue),
        expectedOutcome: 'Issue no longer flagged in the next review'
      })
    )
  ]

  const rows = items
    .map(
      (item) =>
        `### ${item.priority} — ${item.problem}\n` +
        `- **Reason:** ${item.reason}\n` +
        `- **Suggested fix:** ${item.suggestedFix}\n` +
        `- **Affected components:** ${item.affectedComponents.join(', ') || 'unknown'}\n` +
        `- **Expected outcome:** ${item.expectedOutcome}`
    )
    .join('\n\n')

  return {
    name: 'revision-plan.md',
    kind: 'plan',
    description: `Revision plan for iteration ${input.iteration + 1}`,
    content: `# Revision Plan — ${input.missionTitle} (iteration ${input.iteration + 1})\n\nWork ONLY on the items below, highest priority first.\n\n${rows}\n`
  }
}

function extractIssues(reportContent: string): string[] {
  return reportContent
    .split('\n')
    .map((line) => /^\s*[-*]\s+(.+)$/.exec(line)?.[1]?.trim())
    .filter((item): item is string => Boolean(item && !item.startsWith('**')))
}

function suggestFix(problem: string): string {
  const lower = problem.toLowerCase()
  if (lower.includes('footer')) return 'Add a heavier footer surface with a top rule and tighter columns'
  if (lower.includes('spacing')) return 'Re-align to the 96px section rhythm and 12-column grid'
  if (lower.includes('type') || lower.includes('font') || lower.includes('heading'))
    return 'Revisit the display type scale and hierarchy weights'
  if (lower.includes('contrast') || lower.includes('colour') || lower.includes('color'))
    return 'Adjust palette contrast against the accessibility ratios in the spec'
  return 'Address the issue per the creative specification'
}

function guessComponents(problem: string): string[] {
  const components: string[] = []
  for (const [pattern, name] of COMPONENT_HINTS) {
    if (pattern.test(problem)) components.push(name)
  }
  return components
}

const COMPONENT_HINTS: [RegExp, string][] = [
  [/hero/i, 'Hero'],
  [/nav|header/i, 'Navbar'],
  [/footer/i, 'Footer'],
  [/pricing/i, 'Pricing'],
  [/cta|button/i, 'CTA'],
  [/card|feature/i, 'Features'],
  [/anchor/i, 'Footer']
]
