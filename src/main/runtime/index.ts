import { AgentRuntime } from '../../core/runtime/AgentRuntime'
import { buildAgents } from '../../core/agents/roster'
import { createPlaceholderProviders } from '../../core/providers/placeholders'
import { ProviderManager } from '../../core/providers/ProviderManager'
import { ProviderRegistry } from '../../core/providers/ProviderRegistry'
import { SimulatorProvider } from '../../core/providers/SimulatorProvider'
import type { Capability } from '../../core/providers/types'
import { cancelOrphanedManualSessions } from '../db/manualSessions'
import { failOrphanedMissions } from '../db/missions'
import { getSetting, SETTING_KEYS } from '../db/settings'
import { attachRuntimeBridge } from './bridge'
import { buildClaudeCodeProvider } from './claudeCode'
import { buildManualProviders } from './manual'
import { initOrchestrator } from './orchestrator'
import { initReviewEngine } from './review'

let runtime: AgentRuntime | null = null
let providerManager: ProviderManager | null = null

const ALL_CAPABILITIES: Capability[] = ['creative-direction', 'engineering', 'design-qa']

/**
 * Boots the runtime for this app session.
 *
 * Adding a real provider later (Claude Code, GPT, Gemini…) is exactly one
 * `registry.register(new XProvider(...))` call replacing its placeholder —
 * agents, runtime, IPC and UI all discover it from the registry.
 */
export function initRuntime(): void {
  runtime = new AgentRuntime()

  const registry = new ProviderRegistry()
  // AI_STUDIO_SIM_SPEED scales simulated pacing (0.1 = 10× faster) for demos.
  const speed = Number(process.env.AI_STUDIO_SIM_SPEED ?? '1') || 1
  registry.register(new SimulatorProvider(speed))
  for (const manual of buildManualProviders((event) => runtime?.bus.emit(event))) {
    registry.register(manual)
  }
  registry.register(buildClaudeCodeProvider())
  for (const placeholder of createPlaceholderProviders()) registry.register(placeholder)
  for (const capability of ALL_CAPABILITIES) registry.setDefault(capability, 'simulator')

  providerManager = new ProviderManager(registry, (event) => runtime?.bus.emit(event))

  // Restore persisted assignments, dropping any pointing at unavailable providers.
  const saved = getSetting<Record<string, string>>(SETTING_KEYS.providerAssignments, {})
  const assignments = Object.fromEntries(
    Object.entries(saved).filter(([, providerId]) => providerManager?.isAvailable(providerId))
  )

  for (const agent of buildAgents(providerManager, assignments)) {
    runtime.register(agent)
  }

  initReviewEngine((event) => runtime?.bus.emit(event))
  initOrchestrator(runtime)
  attachRuntimeBridge(runtime, providerManager)
  failOrphanedMissions()
  cancelOrphanedManualSessions()

  void providerManager.connect('simulator').catch((error) => {
    console.error('[runtime] simulator failed to connect', error)
  })
}

export function getRuntime(): AgentRuntime {
  if (!runtime) throw new Error('Runtime has not been initialised')
  return runtime
}

export function getProviderManager(): ProviderManager {
  if (!providerManager) throw new Error('Provider manager has not been initialised')
  return providerManager
}
