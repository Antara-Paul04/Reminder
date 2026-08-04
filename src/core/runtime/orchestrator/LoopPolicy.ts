import type { RetryStrategy } from './RetryStrategy'
import { DEFAULT_RETRY_STRATEGY, normalizeRetryStrategy } from './RetryStrategy'

/**
 * Everything that governs the autonomous mission loop. Fully configurable
 * (Settings → Missions) and serializable — a policy travels with the
 * mission and into its report.
 */
export interface LoopPolicy {
  /** Master switch: false = classic manual retry behaviour. */
  autonomous: boolean
  maxIterations: number
  maxDurationMs: number
  /** Reserved for cost-reporting providers; 0 disables the cap. */
  maxCostUsd: number
  /**
   * Minimum overall QA score (0–10) required to complete.
   * null = accept the QA verdict alone.
   */
  qualityThreshold: number | null
  /** Halt on agent errors instead of retrying them. */
  stopOnFailure: boolean
  /** Park the mission for human sign-off instead of auto-completing. */
  requireManualApproval: boolean
  retry: RetryStrategy
  /** Auto-export the mission report on completion. */
  autoExport: boolean
  /** OS notification when the mission settles. */
  notifications: boolean
}

export const DEFAULT_LOOP_POLICY: LoopPolicy = {
  autonomous: true,
  maxIterations: 3,
  maxDurationMs: 30 * 60_000,
  maxCostUsd: 0,
  qualityThreshold: null,
  stopOnFailure: false,
  requireManualApproval: false,
  retry: DEFAULT_RETRY_STRATEGY,
  autoExport: true,
  notifications: true
}

export function normalizeLoopPolicy(partial: Partial<LoopPolicy>): LoopPolicy {
  const merged = { ...DEFAULT_LOOP_POLICY, ...partial }
  merged.maxIterations = Math.min(10, Math.max(1, Math.floor(merged.maxIterations) || 3))
  merged.maxDurationMs = Math.max(60_000, merged.maxDurationMs || DEFAULT_LOOP_POLICY.maxDurationMs)
  if (merged.qualityThreshold !== null) {
    merged.qualityThreshold = Math.min(10, Math.max(0, merged.qualityThreshold))
  }
  merged.retry = normalizeRetryStrategy(merged.retry ?? {})
  return merged
}
