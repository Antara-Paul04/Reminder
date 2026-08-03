import { listTimelineEvents } from '../db/timeline'
import { getRuntime } from '../runtime'
import { registerInspirationHandlers } from './inspiration'
import { registerMissionHandlers } from './missions'
import { registerNoteHandlers } from './notes'
import { registerProjectHandlers } from './projects'
import { registerQaHandlers } from './qa'
import { registerScreenshotHandlers } from './screenshots'
import { registerSpecHandlers } from './specs'
import { handle } from './registry'

export function registerIpcHandlers(): void {
  registerProjectHandlers()
  registerInspirationHandlers()
  registerNoteHandlers()
  registerSpecHandlers()
  registerScreenshotHandlers()
  registerQaHandlers()
  registerMissionHandlers()

  handle('timeline:list', (projectId) => listTimelineEvents(projectId))
  handle('agents:list', () => getRuntime().describeAgents())
}
