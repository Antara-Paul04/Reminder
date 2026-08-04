import type { AgentEvent, AgentRole, AgentStatus, MissionContext } from './types'

/**
 * An agent is a RESPONSIBILITY (creative direction, engineering, QA) — not
 * an implementation. Implementations are providers (src/core/providers);
 * agents delegate execution to whichever provider they are configured with.
 *
 * The runtime only knows this interface. The renderer never sees past it:
 * it cannot tell (and must not care) whether the work behind an agent is a
 * simulator, a child process, a remote API, or a human.
 */
export interface Agent {
  readonly id: string
  readonly name: string
  readonly role: AgentRole
  /** Id of the provider currently executing this agent's work. */
  readonly provider: string
  /** One-line role description shown in the UI. */
  readonly description: string
  status: AgentStatus

  /**
   * Execute this agent's part of a mission, streaming events as work
   * happens. Implementations must respect `context.signal` and stop
   * promptly when it aborts.
   */
  execute(context: MissionContext): AsyncGenerator<AgentEvent>

  /** Wire-format description of this agent for the UI. */
  snapshot(): AgentDescriptor
}

/** Wire-format description of an agent for the UI. */
export interface AgentDescriptor {
  id: string
  name: string
  role: AgentRole
  /** Assigned provider id. */
  provider: string
  /** Assigned provider display name. */
  providerName: string
  status: AgentStatus
  description: string
  preferences: Record<string, unknown>
  configuration: Record<string, unknown>
  memoryCount: number
}
