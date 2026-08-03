import { AgentRuntime } from '../../core/runtime/AgentRuntime'
import { registerSimulatedAgents } from '../../core/agents/simulated'
import { failOrphanedMissions } from '../db/missions'
import { attachRuntimeBridge } from './bridge'

let runtime: AgentRuntime | null = null

/**
 * Boots the agent runtime for this app session. Providers are registered
 * here — swapping the simulated roster for real providers (Claude Code,
 * ChatGPT, Gemini…) is the only change Phase 3 needs to make.
 */
export function initRuntime(): void {
  runtime = new AgentRuntime()
  // AI_STUDIO_SIM_SPEED scales simulated pacing (0.1 = 10× faster) for demos.
  const speed = Number(process.env.AI_STUDIO_SIM_SPEED ?? '1') || 1
  registerSimulatedAgents(runtime, speed)
  attachRuntimeBridge(runtime)
  failOrphanedMissions()
}

export function getRuntime(): AgentRuntime {
  if (!runtime) throw new Error('Runtime has not been initialised')
  return runtime
}
