import {
  REVIEW_CATEGORIES,
  type CategoryScore,
  type ReviewSessionRecord
} from './types'

export function emptyScores(): CategoryScore[] {
  return REVIEW_CATEGORIES.map((category) => ({
    category,
    score: null,
    notes: '',
    confidence: null
  }))
}

export function createReviewSession(input: {
  projectId: string
  missionId: string | null
  iteration: number
  reviewer?: string
}): ReviewSessionRecord {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    missionId: input.missionId,
    iteration: input.iteration,
    status: 'open',
    reviewer: input.reviewer ?? 'you',
    scores: emptyScores(),
    summary: '',
    recommendation: null,
    createdAt: Date.now(),
    completedAt: null
  }
}

/** Merge one category's score into a session's score sheet. */
export function applyScore(
  scores: CategoryScore[],
  update: CategoryScore
): CategoryScore[] {
  const clamped: CategoryScore = {
    ...update,
    score: update.score === null ? null : Math.min(10, Math.max(0, update.score)),
    confidence:
      update.confidence === null ? null : Math.min(1, Math.max(0, update.confidence))
  }
  const rest = scores.filter((s) => s.category !== update.category)
  return [...rest, clamped].sort(
    (a, b) => REVIEW_CATEGORIES.indexOf(a.category) - REVIEW_CATEGORIES.indexOf(b.category)
  )
}

/** Mean of scored categories, or null when nothing is scored yet. */
export function overallScore(scores: CategoryScore[]): number | null {
  const scored = scores.filter((s) => s.score !== null)
  if (scored.length === 0) return null
  return (
    Math.round(
      (scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length) * 10
    ) / 10
  )
}
