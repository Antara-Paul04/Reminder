import { BrowserWindow } from 'electron'
import type { AgentRuntime } from '../../core/runtime/AgentRuntime'
import type { Artifact, ProviderLifecycleEvent, RuntimeEvent } from '../../core/runtime/types'
import type { ProviderManager } from '../../core/providers/ProviderManager'
import { RUNTIME_EVENT_CHANNEL } from '@shared/ipc'
import { insertArtifact } from '../db/artifacts'
import { upsertMission } from '../db/missions'
import { insertQaItem } from '../db/qa'
import { createAuthoredSpec } from '../db/specs'
import { logTimelineEvent } from '../db/timeline'
import { saveLibraryFile } from '../media'
import { getReviewEngine } from './review'

/**
 * Connects the runtime's event bus to the rest of the application:
 *  1. forwards every event to all renderer windows (live UI), and
 *  2. persists the durable consequences (missions, artifacts, timeline,
 *     specs, screenshots, QA items) through the existing repositories.
 *
 * The bridge is the ONLY place runtime activity touches storage — agents
 * and the runner know nothing about the database.
 */
export function attachRuntimeBridge(runtime: AgentRuntime, providers: ProviderManager): void {
  runtime.bus.on((event) => {
    forward(event)
    try {
      persist(runtime, providers, event)
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

function persist(runtime: AgentRuntime, providers: ProviderManager, event: RuntimeEvent): void {
  switch (event.type) {
    case 'provider.connected':
    case 'provider.disconnected':
    case 'provider.error':
      // Global lifecycle: forwarded live above; no per-project timeline home.
      break
    case 'provider.selected':
    case 'provider.execution.started':
    case 'provider.execution.finished': {
      logProviderEvent(runtime, providers, event)
      break
    }
    case 'manual.prompt': {
      const agent = agentName(runtime, event.agentId)
      logTimelineEvent(
        event.projectId,
        event.type,
        `Prompt ready — waiting on ${event.destinationLabel} for ${agent}`,
        event.destinationLabel
      )
      break
    }
    case 'manual.imported': {
      const agent = agentName(runtime, event.agentId)
      const providerName =
        providers.descriptors().find((p) => p.id === event.providerId)?.name ?? 'external AI'
      logTimelineEvent(
        event.projectId,
        event.type,
        `Response imported from ${providerName} for ${agent} (${event.artifactCount} artifact${event.artifactCount === 1 ? '' : 's'})`,
        agent
      )
      break
    }
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
    case 'mission.checkpoint': {
      logTimelineEvent(
        event.projectId,
        event.type,
        `Checkpoint — ${event.stage} (iteration ${event.iteration})`,
        'AI Studio'
      )
      break
    }
    case 'mission.awaiting-approval': {
      logTimelineEvent(
        event.projectId,
        event.type,
        `Iteration ${event.iteration} passed QA — awaiting your approval`,
        'AI Studio'
      )
      break
    }
    case 'mission.metrics':
      break // live-only telemetry
    case 'review.screenshot.imported': {
      logTimelineEvent(
        event.projectId,
        event.type,
        `Screenshot imported — ${event.label} (${event.role}, iteration ${event.iteration})`,
        'AI Studio'
      )
      break
    }
    case 'review.started': {
      logTimelineEvent(event.projectId, event.type, `Review started — iteration ${event.iteration}`, 'you')
      break
    }
    case 'review.annotation.added': {
      logTimelineEvent(event.projectId, event.type, `Annotation: ${event.text}`, 'you')
      break
    }
    case 'review.completed': {
      logTimelineEvent(
        event.projectId,
        event.type,
        `Review completed — ${event.recommendation} (iteration ${event.iteration})`,
        'you'
      )
      break
    }
    case 'review.iteration': {
      logTimelineEvent(
        event.projectId,
        event.type,
        `Iteration ${event.iteration} ${event.status}`,
        'AI Studio'
      )
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

function agentName(runtime: AgentRuntime, agentId: string): string {
  return runtime.describeAgents().find((a) => a.id === agentId)?.name ?? agentId
}

/** Writes provider lifecycle moments into the per-project activity timeline. */
function logProviderEvent(
  runtime: AgentRuntime,
  providers: ProviderManager,
  event: Extract<
    ProviderLifecycleEvent,
    { type: 'provider.selected' | 'provider.execution.started' | 'provider.execution.finished' }
  >
): void {
  const projectId = 'projectId' in event ? event.projectId : undefined
  if (!projectId) return

  const providerName =
    providers.descriptors().find((p) => p.id === event.providerId)?.name ?? event.providerId
  const agentName =
    runtime.describeAgents().find((a) => a.id === event.agentId)?.name ?? event.agentId

  const message =
    event.type === 'provider.selected'
      ? `${agentName} is now powered by ${providerName}`
      : event.type === 'provider.execution.started'
        ? `${providerName} engaged for ${agentName}`
        : `${providerName} ${event.ok ? 'finished work for' : 'aborted work for'} ${agentName}`

  logTimelineEvent(projectId, event.type, message, providerName)
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
      // First-class review artifact: iteration-scoped, engineer-sourced.
      getReviewEngine().importScreenshot({
        projectId,
        missionId: artifact.missionId,
        filePath,
        label: artifact.name,
        source: 'engineer',
        role: 'current'
      })
      break
    }
    default:
      break // code / log / qa-report artifacts live in the mission record only
  }
}
