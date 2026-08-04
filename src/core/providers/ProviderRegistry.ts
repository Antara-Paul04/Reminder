import type { Provider } from './Provider'
import type { Capability } from './types'

/**
 * Owns every available provider. Adding a future provider to AI Studio is
 * exactly one `register()` call — the runtime, agents and UI discover it
 * from here; no other code changes.
 */
export class ProviderRegistry {
  private providers = new Map<string, Provider>()
  private defaults = new Map<Capability, string>()

  register(provider: Provider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider already registered: ${provider.id}`)
    }
    this.providers.set(provider.id, provider)
  }

  unregister(id: string): void {
    this.providers.delete(id)
    for (const [capability, providerId] of this.defaults) {
      if (providerId === id) this.defaults.delete(capability)
    }
  }

  get(id: string): Provider {
    const provider = this.providers.get(id)
    if (!provider) throw new Error(`Unknown provider: ${id}`)
    return provider
  }

  maybeGet(id: string): Provider | null {
    return this.providers.get(id) ?? null
  }

  list(): Provider[] {
    return [...this.providers.values()]
  }

  findByCapability(capability: Capability): Provider[] {
    return this.list().filter((p) => p.capabilities.includes(capability))
  }

  setDefault(capability: Capability, providerId: string): void {
    const provider = this.get(providerId)
    if (!provider.capabilities.includes(capability)) {
      throw new Error(`${provider.name} does not support ${capability}`)
    }
    this.defaults.set(capability, providerId)
  }

  getDefault(capability: Capability): Provider | null {
    const id = this.defaults.get(capability)
    return id ? this.maybeGet(id) : null
  }
}
