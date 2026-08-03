import type { AgentEvent, AgentRole, AgentStatus, MissionContext } from './types'

/**
 * The provider contract. Every agent — simulated today; Claude Code, ChatGPT,
 * Gemini or anything else tomorrow — implements exactly this interface.
 *
 * The renderer never sees past this boundary: it cannot tell (and must not
 * care) whether an agent is a simulator, a child process, or a remote API.
 */
export interface Agent {
  readonly id: string
  readonly name: string
  readonly role: AgentRole
  /** Provider identifier, e.g. 'simulated', 'claude-code', 'openai'. */
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
}

/** Wire-format description of an agent for the UI. */
export interface AgentDescriptor {
  id: string
  name: string
  role: AgentRole
  provider: string
  status: AgentStatus
  description: string
}
