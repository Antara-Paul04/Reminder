import { MissionCancelledError } from '../runtime/types'
import type { Provider } from './Provider'
import { describeProvider } from './Provider'
import type { ProviderRegistry } from './ProviderRegistry'
import { providerEvent, type ProviderEventEmitter, type ProviderStreamEvent } from './ProviderEvents'
import type { Capability, ProviderDescriptor, ProviderExecutionRequest } from './types'

/**
 * Runtime authority over providers: connection state, health, availability,
 * per-agent selection, and execution boundaries. Everything it does is
 * announced as lifecycle events on the runtime bus.
 *
 * Future authentication lives here too: `connect()` is where a real
 * provider will perform OAuth / token exchange / process spawn before
 * reporting itself connected.
 */
export class ProviderManager {
  /** agentId → providerId */
  private assignments = new Map<string, string>()

  constructor(
    private readonly registry: ProviderRegistry,
    private readonly emit: ProviderEventEmitter = () => {}
  ) {}

  // -- selection ------------------------------------------------------------

  /** Silent default assignment (used at boot; emits nothing). */
  assign(agentId: string, providerId: string): void {
    this.assignments.set(agentId, providerId)
  }

  /** User-driven selection: validated, persisted by the host, announced. */
  select(
    agentId: string,
    providerId: string,
    options: { capability: Capability; projectId?: string }
  ): void {
    const provider = this.registry.get(providerId)
    if (provider.comingSoon) {
      throw new Error(`${provider.name} is not available yet`)
    }
    if (!provider.capabilities.includes(options.capability)) {
      throw new Error(`${provider.name} does not support ${options.capability}`)
    }
    this.assignments.set(agentId, providerId)
    this.emit(providerEvent('provider.selected', { providerId, agentId, projectId: options.projectId }))
  }

  assignmentFor(agentId: string): string {
    const providerId = this.assignments.get(agentId)
    if (!providerId) throw new Error(`No provider assigned to agent: ${agentId}`)
    return providerId
  }

  providerFor(agentId: string): Provider {
    return this.registry.get(this.assignmentFor(agentId))
  }

  assignmentsSnapshot(): Record<string, string> {
    return Object.fromEntries(this.assignments)
  }

  // -- connection & health --------------------------------------------------

  async connect(providerId: string): Promise<void> {
    const provider = this.registry.get(providerId)
    if (provider.status === 'connected') return
    provider.status = 'connecting'
    try {
      await provider.connect()
      provider.status = 'connected'
      this.emit(providerEvent('provider.connected', { providerId }))
    } catch (error) {
      provider.status = provider.comingSoon ? 'unavailable' : 'error'
      this.emit(
        providerEvent('provider.error', {
          providerId,
          message: error instanceof Error ? error.message : String(error)
        })
      )
      throw error
    }
  }

  async disconnect(providerId: string, reason?: string): Promise<void> {
    const provider = this.registry.get(providerId)
    if (provider.status !== 'connected') return
    await provider.disconnect()
    provider.status = 'disconnected'
    this.emit(providerEvent('provider.disconnected', { providerId, reason }))
  }

  /** A provider is healthy when it is connected or can connect on demand. */
  isAvailable(providerId: string): boolean {
    const provider = this.registry.maybeGet(providerId)
    return provider !== null && !provider.comingSoon
  }

  descriptors(): ProviderDescriptor[] {
    return this.registry.list().map(describeProvider)
  }

  findByCapability(capability: Capability): ProviderDescriptor[] {
    return this.registry.findByCapability(capability).map(describeProvider)
  }

  // -- execution ------------------------------------------------------------

  /**
   * Execute work for an agent through its assigned provider, wrapping the
   * stream in execution-boundary events. Lazily connects first.
   */
  async *executeFor(
    agentId: string,
    request: ProviderExecutionRequest
  ): AsyncGenerator<ProviderStreamEvent> {
    const provider = this.providerFor(agentId)
    await this.connect(provider.id)

    const scope = {
      providerId: provider.id,
      agentId,
      missionId: request.context.mission.id,
      projectId: request.context.mission.projectId
    }
    this.emit(providerEvent('provider.execution.started', scope))
    try {
      yield* provider.execute(request)
      this.emit(providerEvent('provider.execution.finished', { ...scope, ok: true }))
    } catch (error) {
      this.emit(providerEvent('provider.execution.finished', { ...scope, ok: false }))
      // A cancelled mission is not a provider fault.
      if (!(error instanceof MissionCancelledError)) {
        this.emit(
          providerEvent('provider.error', {
            providerId: provider.id,
            message: error instanceof Error ? error.message : String(error)
          })
        )
      }
      throw error
    }
  }
}
