import { listManualSessions } from '../db/manualSessions'
import { getManualProvider, listManualProviders } from '../runtime/manual'
import { handle } from './registry'

export function registerManualHandlers(): void {
  handle('manual:pending', (projectId) =>
    listManualProviders().flatMap((provider) => provider.pending(projectId))
  )

  handle('manual:import', (providerId, sessionId, response) =>
    getManualProvider(providerId).importResponse(sessionId, response)
  )

  handle('manual:copy', (providerId, sessionId) =>
    getManualProvider(providerId).copyPrompt(sessionId)
  )

  handle('manual:open', (providerId) => getManualProvider(providerId).openDestination())

  handle('manual:sessions', (projectId, query) => listManualSessions(projectId, query))
}
