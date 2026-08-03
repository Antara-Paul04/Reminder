import type { AgentInfo } from '@shared/types'

/**
 * The agent roster. Phase 1 exposes it read-only so the UI can bind to real
 * shapes; Phase 2 replaces this with live orchestration (each agent gets an
 * adapter implementing a common run/stream interface — see AgentInfo.provider).
 */
export function listAgents(): AgentInfo[] {
  return [
    {
      id: 'creative-director',
      name: 'Creative Director',
      role: 'Turns briefs and inspiration into design specs',
      provider: 'anthropic-api',
      status: 'unavailable'
    },
    {
      id: 'engineer',
      name: 'Engineer',
      role: 'Claude Code — implements the spec as a Framer template',
      provider: 'claude-code',
      status: 'unavailable'
    },
    {
      id: 'design-qa',
      name: 'Design QA',
      role: 'Reviews output against the spec and files feedback',
      provider: 'anthropic-api',
      status: 'unavailable'
    }
  ]
}
