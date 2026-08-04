import { listTimelineEvents } from '../db/timeline'
import { getRuntime } from '../runtime'
import { registerClaudeCodeHandlers } from './claudeCode'
import { registerInspirationHandlers } from './inspiration'
import { registerManualHandlers } from './manual'
import { registerMissionHandlers } from './missions'
import { registerNoteHandlers } from './notes'
import { registerProjectHandlers } from './projects'
import { registerProviderHandlers } from './providers'
import { registerQaHandlers } from './qa'
import { registerReviewHandlers } from './review'
import { registerSpecHandlers } from './specs'
import { handle } from './registry'

export function registerIpcHandlers(): void {
  registerProjectHandlers()
  registerInspirationHandlers()
  registerNoteHandlers()
  registerSpecHandlers()
  registerReviewHandlers()
  registerQaHandlers()
  registerMissionHandlers()
  registerProviderHandlers()
  registerManualHandlers()
  registerClaudeCodeHandlers()

  handle('timeline:list', (projectId) => listTimelineEvents(projectId))
  handle('agents:list', () => getRuntime().describeAgents())
}
