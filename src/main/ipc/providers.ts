import { app } from 'electron'
import { ROLE_CAPABILITY } from '../../core/providers/types'
import { getSetting, setSetting, SETTING_KEYS } from '../db/settings'
import { getProviderManager, getRuntime } from '../runtime'
import { handle } from './registry'

export function registerProviderHandlers(): void {
  handle('providers:list', () => getProviderManager().descriptors())

  handle('providers:select', (agentId, providerId, projectId) => {
    const agent = getRuntime()
      .describeAgents()
      .find((a) => a.id === agentId)
    if (!agent) throw new Error(`Unknown agent: ${agentId}`)

    const manager = getProviderManager()
    manager.select(agentId, providerId, {
      capability: ROLE_CAPABILITY[agent.role],
      projectId
    })

    const saved = getSetting<Record<string, string>>(SETTING_KEYS.providerAssignments, {})
    setSetting(SETTING_KEYS.providerAssignments, { ...saved, [agentId]: providerId })
  })

  handle('providers:connect', (providerId) => getProviderManager().connect(providerId))
  handle('providers:disconnect', (providerId) => getProviderManager().disconnect(providerId))

  handle('app:info', () => ({
    version: app.getVersion(),
    dataDir: app.getPath('userData')
  }))
}
