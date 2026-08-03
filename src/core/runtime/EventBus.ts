import type { RuntimeEvent, RuntimeEventType } from './types'

export type RuntimeEventHandler = (event: RuntimeEvent) => void

/**
 * Synchronous, typed pub/sub. Everything in the runtime — and every UI
 * panel, via the IPC forwarder — communicates through this bus.
 */
export class EventBus {
  private handlers = new Set<RuntimeEventHandler>()

  /** Subscribe to every runtime event. Returns an unsubscribe function. */
  on(handler: RuntimeEventHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  /** Subscribe to a single event type. Returns an unsubscribe function. */
  onType<T extends RuntimeEventType>(
    type: T,
    handler: (event: Extract<RuntimeEvent, { type: T }>) => void
  ): () => void {
    return this.on((event) => {
      if (event.type === type) handler(event as Extract<RuntimeEvent, { type: T }>)
    })
  }

  emit(event: RuntimeEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event)
      } catch (error) {
        // A faulty subscriber must never break the mission loop.
        console.error('[EventBus] handler threw', error)
      }
    }
  }
}
