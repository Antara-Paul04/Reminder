import type { AgentEvent, ProviderLifecycleEvent } from '../runtime/types'

/**
 * The two event families of the provider layer:
 *
 * 1. STREAM events — what a provider yields while executing work. These are
 *    structurally the agent-event vocabulary: providers speak the same
 *    language agents do, so the runtime never needs translation.
 *
 * 2. LIFECYCLE events — connection, selection, execution boundaries and
 *    errors, emitted by the ProviderManager onto the runtime bus
 *    (ProviderConnected, ProviderDisconnected, ProviderSelected,
 *    ProviderExecutionStarted, ProviderExecutionFinished, ProviderError).
 */

export type ProviderStreamEvent = AgentEvent

export type { ProviderLifecycleEvent }

export type ProviderEventEmitter = (event: ProviderLifecycleEvent) => void

/** Stamps identity onto a lifecycle event payload. */
export function providerEvent<T extends ProviderLifecycleEvent['type']>(
  type: T,
  payload: Omit<Extract<ProviderLifecycleEvent, { type: T }>, 'type' | 'id' | 'at'>
): Extract<ProviderLifecycleEvent, { type: T }> {
  return {
    ...payload,
    type,
    id: crypto.randomUUID(),
    at: Date.now()
  } as Extract<ProviderLifecycleEvent, { type: T }>
}
