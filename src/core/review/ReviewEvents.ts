import type { ReviewRuntimeEvent } from '../runtime/types'

/**
 * Review events ride the same runtime bus as mission and provider events —
 * the bridge persists them to the timeline, the renderer updates live.
 */
export type { ReviewRuntimeEvent }

export type ReviewEventEmitter = (event: ReviewRuntimeEvent) => void

export function reviewEvent<T extends ReviewRuntimeEvent['type']>(
  type: T,
  payload: Omit<Extract<ReviewRuntimeEvent, { type: T }>, 'type' | 'id' | 'at'>
): Extract<ReviewRuntimeEvent, { type: T }> {
  return {
    ...payload,
    type,
    id: crypto.randomUUID(),
    at: Date.now()
  } as Extract<ReviewRuntimeEvent, { type: T }>
}
