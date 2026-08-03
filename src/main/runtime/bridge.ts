import { BrowserWindow } from 'electron'
import type { AgentRuntime } from '../../core/runtime/AgentRuntime'
import type { Artifact, RuntimeEvent } from '../../core/runtime/types'
import { RUNTIME_EVENT_CHANNEL } from '@shared/ipc'
import { insertArtifact } from '../db/artifacts'
import { upsertMission } from '../db/missions'
import { insertQaItem } from '../db/qa'
import { insertScreenshot } from '../db/screenshots'
import { createAuthoredSpec } from '../db/specs'
import { logTimelineEvent } from '../db/timeline'
import { saveLibraryFile } from '../media'

/**
 * Connects the runtime's event bus to the rest of the application:
 *  1. forwards every event to all renderer windows (live UI), and
 *  2. persists the durable consequences (missions, artifacts, timeline,
 *     specs, screenshots, QA items) through the existing repositories.
 *
 * The bridge is the ONLY place runtime activity touches storage — agents
 * and the runner know nothing about the database.
 */
export function attachRuntimeBridge(runtime: AgentRuntime): void {
  runtime.bus.on((event) => {
    forward(event)
    try {
      persist(runtime, event)
    } catch (error) {
      console.error('[runtime-bridge] persistence failed for', event.type, error)
    }
  })
}

function forward(event: RuntimeEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(RUNTIME_EVENT_CHANNEL, event)
  }
}

function persist(runtime: AgentRuntime, event: RuntimeEvent): void {
  switch (event.type) {
    case 'mission.started':
    case 'mission.stage':
    case 'mission.paused':
    case 'mission.resumed':
    case 'mission.completed':
    case 'mission.cancelled': {
      syncMissionRow(runtime, event.missionId)
      break
    }
    case 'mission.failed': {
      syncMissionRow(runtime, event.missionId)
      insertQaItem(event.projectId, event.reason, 'high')
      break
    }
    case 'agent.artifact': {
      insertArtifact({
        id: event.artifact.id,
        missionId: event.artifact.missionId,
        name: event.artifact.name,
        kind: event.artifact.kind,
        description: event.artifact.description,
        content: event.artifact.content,
        createdBy: event.artifact.createdBy,
        createdAt: event.artifact.createdAt
      })
      materializeArtifact(runtime, event.projectId, event.agentId, event.artifact)
      break
    }
    case 'timeline.entry': {
      logTimelineEvent(event.projectId, event.entry.type, event.entry.message, event.entry.actor)
      break
    }
    default:
      break // transient events (status, message, progress) are not persisted
  }
}

function syncMissionRow(runtime: AgentRuntime, missionId: string): void {
  const snapshot = runtime.missionSnapshot(missionId)
  if (snapshot) upsertMission(snapshot)
}

/** Projects agent artifacts into the panels users already work in. */
function materializeArtifact(
  runtime: AgentRuntime,
  projectId: string,
  agentId: string,
  artifact: Artifact
): void {
  const author =
    runtime.describeAgents().find((a) => a.id === agentId)?.name ?? agentId

  switch (artifact.kind) {
    case 'spec':
    case 'plan':
      createAuthoredSpec(projectId, artifact.name, artifact.content, author)
      break
    case 'image': {
      const bytes = new TextEncoder().encode(artifact.content)
      const filePath = saveLibraryFile('screenshots', projectId, {
        name: artifact.name,
        bytes: bytes.buffer as ArrayBuffer
      })
      insertScreenshot(projectId, filePath, artifact.name)
      break
    }
    default:
      break // code / log / qa-report artifacts live in the mission record only
  }
}
