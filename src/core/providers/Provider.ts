import type { ProviderStreamEvent } from './ProviderEvents'
import type {
  Capability,
  ProviderDescriptor,
  ProviderExecutionRequest,
  ProviderStatus,
  ProviderType
} from './types'

/**
 * The provider contract. Anything that can do work implements this:
 * the simulator, Claude Code, Codex CLI, GPT/Gemini APIs, or a human
 * review queue. Agents delegate execution here; the runtime never sees
 * past this boundary.
 */
export interface Provider {
  readonly id: string
  readonly name: string
  readonly type: ProviderType
  readonly capabilities: Capability[]
  readonly description: string
  /** True for placeholder providers that cannot be selected yet. */
  readonly comingSoon?: boolean
  status: ProviderStatus

  /** Establish whatever session the implementation needs (auth, spawn…). */
  connect(): Promise<void>
  disconnect(): Promise<void>

  /**
   * Execute one unit of work, streaming events as they happen. Must respect
   * `request.context.signal` and stop promptly when it aborts.
   */
  execute(request: ProviderExecutionRequest): AsyncGenerator<ProviderStreamEvent>
}

export function describeProvider(provider: Provider): ProviderDescriptor {
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    capabilities: [...provider.capabilities],
    status: provider.status,
    description: provider.description,
    comingSoon: provider.comingSoon ?? false
  }
}

/**
 * A visible-but-not-yet-implemented provider. Registering one is pure
 * architecture: it appears in the registry, the Settings UI and capability
 * lookups, but refuses to connect or execute until a real implementation
 * replaces it.
 */
export class PlaceholderProvider implements Provider {
  readonly comingSoon = true
  status: ProviderStatus = 'unavailable'

  constructor(
    readonly id: string,
    readonly name: string,
    readonly type: ProviderType,
    readonly capabilities: Capability[],
    readonly description: string
  ) {}

  connect(): Promise<void> {
    return Promise.reject(new Error(`${this.name} is not available yet`))
  }

  disconnect(): Promise<void> {
    return Promise.resolve()
  }

  // eslint-disable-next-line require-yield
  async *execute(): AsyncGenerator<ProviderStreamEvent> {
    throw new Error(`${this.name} is not available yet`)
  }
}
