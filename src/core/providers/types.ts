import type { AgentRole, MissionContext } from '../runtime/types'

/**
 * Provider abstraction types. A PROVIDER is an implementation of work
 * (simulator, CLI tool, API, or a human); an AGENT is a responsibility that
 * delegates to whichever provider it is configured with.
 */

export type ProviderType = 'simulator' | 'manual' | 'api' | 'cli'

export type ProviderStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'unavailable'

/** What a provider can do. Agents require exactly one capability per role. */
export type Capability = 'creative-direction' | 'engineering' | 'design-qa'

export const ROLE_CAPABILITY: Record<AgentRole, Capability> = {
  creative: 'creative-direction',
  engineer: 'engineering',
  qa: 'design-qa'
}

export const CAPABILITY_LABELS: Record<Capability, string> = {
  'creative-direction': 'Creative direction',
  engineering: 'Engineering',
  'design-qa': 'Design QA'
}

/** Wire-format description of a provider for the UI. */
export interface ProviderDescriptor {
  id: string
  name: string
  type: ProviderType
  capabilities: Capability[]
  status: ProviderStatus
  description: string
  /** Placeholder providers are visible but not selectable yet. */
  comingSoon: boolean
}

/** Everything a provider receives when asked to execute one mission step. */
export interface ProviderExecutionRequest {
  agentId: string
  role: AgentRole
  capability: Capability
  /** The agent's accumulated learnings (project memory). */
  memory: string[]
  context: MissionContext
}
