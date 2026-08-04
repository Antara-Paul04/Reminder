/**
 * How the loop treats agent ERRORS (provider crashes, timeouts) — distinct
 * from QA rejections, which are the loop's normal revision path.
 */
export interface RetryStrategy {
  /** Automatic retries per mission before halting. */
  maxRetries: number
  /** Base delay before an automatic retry. */
  backoffMs: number
  /** Multiplier applied per successive retry. */
  backoffFactor: number
}

export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 2,
  backoffMs: 3_000,
  backoffFactor: 2
}

export function normalizeRetryStrategy(partial: Partial<RetryStrategy>): RetryStrategy {
  const merged = { ...DEFAULT_RETRY_STRATEGY, ...partial }
  merged.maxRetries = Math.min(5, Math.max(0, Math.floor(merged.maxRetries) ?? 0))
  merged.backoffMs = Math.max(0, merged.backoffMs)
  merged.backoffFactor = Math.max(1, merged.backoffFactor)
  return merged
}

export function retryDelay(strategy: RetryStrategy, attempt: number): number {
  return Math.round(strategy.backoffMs * Math.pow(strategy.backoffFactor, Math.max(0, attempt)))
}

export function shouldRetryError(strategy: RetryStrategy, errorRetriesSoFar: number): boolean {
  return errorRetriesSoFar < strategy.maxRetries
}
