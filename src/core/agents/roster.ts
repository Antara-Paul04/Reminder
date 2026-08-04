import type { ProviderManager } from '../providers/ProviderManager'
import { ConfiguredAgent, type AgentConfig } from './ConfiguredAgent'

/** The default team. Pure configuration — no implementation details. */
export const DEFAULT_AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'creative-director',
    name: 'Creative Director',
    role: 'creative',
    description: 'Turns briefs and inspiration into design specs',
    providerId: 'simulator',
    preferences: { tone: 'editorial', riskAppetite: 'bold' },
    memory: [],
    configuration: {}
  },
  {
    id: 'engineer',
    name: 'Engineer',
    role: 'engineer',
    description: 'Implements the spec as a Framer template',
    providerId: 'simulator',
    preferences: { verbosity: 'concise' },
    memory: [],
    configuration: { breakpoints: [1280, 768, 375] }
  },
  {
    id: 'design-qa',
    name: 'Design QA',
    role: 'qa',
    description: 'Reviews output against the spec and files feedback',
    providerId: 'simulator',
    preferences: { strictness: 'high' },
    memory: [],
    configuration: { approvalThreshold: 8.5 }
  }
]

/**
 * Builds the team, honouring any persisted provider assignments the host
 * hands in. Assignments the manager already knows are left untouched.
 */
export function buildAgents(
  providers: ProviderManager,
  assignments: Record<string, string> = {}
): ConfiguredAgent[] {
  return DEFAULT_AGENT_CONFIGS.map((config) => {
    const providerId = assignments[config.id] ?? config.providerId
    providers.assign(config.id, providerId)
    return new ConfiguredAgent(config, providers)
  })
}
