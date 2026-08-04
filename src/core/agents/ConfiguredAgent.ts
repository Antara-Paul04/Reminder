import type { Agent, AgentDescriptor } from '../runtime/Agent'
import type { AgentEvent, AgentRole, AgentStatus, MissionContext } from '../runtime/types'
import type { ProviderManager } from '../providers/ProviderManager'
import { ROLE_CAPABILITY } from '../providers/types'

/**
 * Everything that defines an agent besides its implementation. Swapping the
 * implementation is a configuration change (providerId), never a code change.
 */
export interface AgentConfig {
  id: string
  name: string
  role: AgentRole
  description: string
  /** Default provider; live assignment is owned by the ProviderManager. */
  providerId: string
  /** Soft behavioural knobs a provider may honour (tone, verbosity…). */
  preferences: Record<string, unknown>
  /** Rolling learnings the agent accumulates across missions. */
  memory: string[]
  /** Hard settings a provider may need (paths, models, endpoints…). */
  configuration: Record<string, unknown>
}

/**
 * The one Agent implementation the runtime needs: a configured
 * responsibility that delegates all execution to its assigned provider
 * through the ProviderManager. There is no SimulatedAgent, ClaudeAgent or
 * GptAgent — only configurations pointing at different providers.
 */
export class ConfiguredAgent implements Agent {
  status: AgentStatus = 'idle'

  constructor(
    readonly config: AgentConfig,
    private readonly providers: ProviderManager
  ) {}

  get id(): string {
    return this.config.id
  }

  get name(): string {
    return this.config.name
  }

  get role(): AgentRole {
    return this.config.role
  }

  get description(): string {
    return this.config.description
  }

  /** Live provider assignment (falls back to the configured default). */
  get provider(): string {
    try {
      return this.providers.assignmentFor(this.id)
    } catch {
      return this.config.providerId
    }
  }

  async *execute(context: MissionContext): AsyncGenerator<AgentEvent> {
    yield* this.providers.executeFor(this.id, {
      agentId: this.id,
      role: this.role,
      capability: ROLE_CAPABILITY[this.role],
      memory: [...this.config.memory],
      context
    })
  }

  /** Append a learning to this agent's memory. */
  remember(entry: string): void {
    this.config.memory.push(entry)
  }

  snapshot(): AgentDescriptor {
    const providerId = this.provider
    const provider = this.providers.descriptors().find((p) => p.id === providerId)
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      provider: providerId,
      providerName: provider?.name ?? providerId,
      status: this.status,
      description: this.description,
      preferences: { ...this.config.preferences },
      configuration: { ...this.config.configuration },
      memoryCount: this.config.memory.length
    }
  }
}
