import type { Artifact } from '../types'
import type { LoopPolicy } from './LoopPolicy'

export interface ApprovalDecision {
  action: 'complete' | 'revise' | 'halt' | 'await-approval'
  reason: string
  overallScore: number | null
}

/**
 * Decides when a mission is DONE. Consulted after every QA verdict:
 * quality threshold, iteration limit, duration cap and manual-approval
 * requirements all live here — nowhere else.
 */
export class ApprovalEngine {
  constructor(private readonly policy: LoopPolicy) {}

  /** After a QA approval — is this actually good enough to complete? */
  onApproved(input: {
    iteration: number
    elapsedMs: number
    artifacts: Artifact[]
  }): ApprovalDecision {
    const overallScore = latestQaScore(input.artifacts)

    if (
      this.policy.qualityThreshold !== null &&
      overallScore !== null &&
      overallScore < this.policy.qualityThreshold
    ) {
      if (input.iteration >= this.policy.maxIterations) {
        return {
          action: 'complete',
          reason: `Iteration limit (${this.policy.maxIterations}) reached — completing at ${overallScore}/10, below the ${this.policy.qualityThreshold} threshold`,
          overallScore
        }
      }
      return {
        action: 'revise',
        reason: `QA approved at ${overallScore}/10 but the quality threshold is ${this.policy.qualityThreshold}`,
        overallScore
      }
    }

    if (this.policy.requireManualApproval) {
      return {
        action: 'await-approval',
        reason: 'Quality gate passed — awaiting manual approval per policy',
        overallScore
      }
    }
    return { action: 'complete', reason: 'Quality gate passed', overallScore }
  }

  /** After a QA rejection — keep looping or stop? */
  onRejected(input: { iteration: number; elapsedMs: number; reason: string }): ApprovalDecision {
    if (input.iteration >= this.policy.maxIterations) {
      return {
        action: 'halt',
        reason: `Iteration limit (${this.policy.maxIterations}) reached without approval`,
        overallScore: null
      }
    }
    if (input.elapsedMs >= this.policy.maxDurationMs) {
      return {
        action: 'halt',
        reason: `Duration limit (${Math.round(this.policy.maxDurationMs / 60000)}m) reached`,
        overallScore: null
      }
    }
    return { action: 'revise', reason: input.reason, overallScore: null }
  }
}

/**
 * Parses the overall score from the newest qa-report artifact — works for
 * the simulator, manual imports and any provider that follows the
 * `| Category | N |` markdown convention.
 */
export function latestQaScore(artifacts: Artifact[]): number | null {
  const report = [...artifacts].reverse().find((a) => a.kind === 'qa-report')
  if (!report) return null
  const scores = [...report.content.matchAll(/\|\s*[A-Za-z ]+\s*\|\s*(\d+(?:\.\d+)?)\s*\|/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n <= 10)
  if (scores.length === 0) return null
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
}
