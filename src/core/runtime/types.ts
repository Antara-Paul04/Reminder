/**
 * Core runtime types. This module is process-agnostic and dependency-free:
 * it must never import from electron, the database, or the renderer.
 */

export type AgentRole = 'creative' | 'engineer' | 'qa'

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'waiting'
  | 'reviewing'
  | 'complete'
  | 'failed'

export type MissionStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export type MissionStage =
  | 'research'
  | 'creative-direction'
  | 'planning'
  | 'engineering'
  | 'qa'
  | 'complete'

export const MISSION_STAGES: MissionStage[] = [
  'research',
  'creative-direction',
  'planning',
  'engineering',
  'qa',
  'complete'
]

export const STAGE_LABELS: Record<MissionStage, string> = {
  research: 'Research',
  'creative-direction': 'Creative Direction',
  planning: 'Planning',
  engineering: 'Engineering',
  qa: 'QA',
  complete: 'Complete'
}

// ---------------------------------------------------------------------------
// Artifacts — the only way agents communicate with each other.
// ---------------------------------------------------------------------------

export type ArtifactKind = 'spec' | 'plan' | 'code' | 'log' | 'image' | 'qa-report'

/** What an agent yields; the runtime stamps identity onto it. */
export interface ArtifactDraft {
  name: string
  kind: ArtifactKind
  content: string
  description: string
}

export interface Artifact extends ArtifactDraft {
  id: string
  missionId: string
  createdBy: string
  createdAt: number
}

// ---------------------------------------------------------------------------
// Mission
// ---------------------------------------------------------------------------

export interface MissionReference {
  kind: 'image' | 'url'
  title: string
  url: string | null
}

export interface MissionTimelineEntry {
  id: string
  type: string
  message: string
  actor: string
  at: number
}

export interface Mission {
  id: string
  projectId: string
  title: string
  brief: string
  notes: string[]
  references: MissionReference[]
  artifacts: Artifact[]
  timeline: MissionTimelineEntry[]
  status: MissionStatus
  stage: MissionStage
  /** Pipeline step to resume from after a failure; null when healthy. */
  failedStepIndex: number | null
  createdAt: number
  updatedAt: number
}

/** Immutable wire-format snapshot of a mission (safe to send to the UI). */
export type MissionSnapshot = Readonly<Omit<Mission, 'artifacts' | 'timeline'>> & {
  readonly artifactCount: number
}

// ---------------------------------------------------------------------------
// Agent contract — every provider (simulated, Claude Code, ChatGPT, Gemini…)
// implements exactly this.
// ---------------------------------------------------------------------------

/** Everything an agent may see while executing a mission step. */
export interface MissionContext {
  mission: MissionSnapshot
  brief: string
  notes: string[]
  references: MissionReference[]
  /** Artifacts produced by upstream agents, oldest first. */
  artifacts: Artifact[]
  /** How many times this step has executed (0 = first run, 1+ = retry/rework). */
  attempt: number
  /** Aborted on cancel; agents must stop promptly. */
  signal: AbortSignal
}

/** Everything an agent may emit while executing. */
export type AgentEvent =
  | { type: 'status'; status: AgentStatus }
  | { type: 'message'; text: string }
  | { type: 'progress'; percent: number; label?: string }
  | { type: 'artifact'; artifact: ArtifactDraft }
  | { type: 'stage'; stage: MissionStage }
  | { type: 'verdict'; approved: boolean; reason?: string }

// ---------------------------------------------------------------------------
// Runtime events — the event bus vocabulary. Every UI panel subscribes to
// these instead of polling state.
// ---------------------------------------------------------------------------

interface BaseEvent {
  id: string
  at: number
  missionId: string
  projectId: string
}

/** Live orchestration metrics, broadcast so the dashboard renders like CI. */
export interface MissionMetricsSnapshot {
  missionId: string
  iteration: number
  startedAt: number
  elapsedMs: number
  artifactsCreated: number
  filesChanged: number
  agentEvents: number
  health: 'healthy' | 'degraded' | 'failing'
  /** Estimated ms remaining, null when unknowable. */
  estimatedRemainingMs: number | null
  currentAgentId: string | null
  currentTask: string | null
}

export type MissionRuntimeEvent =
  | (BaseEvent & { type: 'mission.started'; mission: MissionSnapshot })
  | (BaseEvent & { type: 'mission.paused' })
  | (BaseEvent & { type: 'mission.resumed' })
  | (BaseEvent & { type: 'mission.stage'; stage: MissionStage })
  | (BaseEvent & { type: 'mission.completed' })
  | (BaseEvent & { type: 'mission.failed'; reason: string; failedStepIndex: number })
  | (BaseEvent & { type: 'mission.cancelled' })
  | (BaseEvent & { type: 'agent.started'; agentId: string; role: AgentRole })
  | (BaseEvent & { type: 'agent.status'; agentId: string; status: AgentStatus })
  | (BaseEvent & { type: 'agent.message'; agentId: string; text: string })
  | (BaseEvent & { type: 'agent.progress'; agentId: string; percent: number; label?: string })
  | (BaseEvent & { type: 'agent.artifact'; agentId: string; artifact: Artifact })
  | (BaseEvent & { type: 'agent.completed'; agentId: string })
  | (BaseEvent & { type: 'agent.failed'; agentId: string; reason: string })
  | (BaseEvent & { type: 'timeline.entry'; entry: MissionTimelineEntry })
  | (BaseEvent & { type: 'mission.metrics'; metrics: MissionMetricsSnapshot })
  | (BaseEvent & { type: 'mission.checkpoint'; stage: MissionStage; iteration: number })
  | (BaseEvent & { type: 'mission.awaiting-approval'; iteration: number })

/**
 * Provider lifecycle events (see src/core/providers). They ride the same
 * bus as mission events; not all of them carry a mission/project scope.
 */
interface ProviderEventBase {
  id: string
  at: number
  providerId: string
}

export type ProviderLifecycleEvent =
  | (ProviderEventBase & { type: 'provider.connected' })
  | (ProviderEventBase & { type: 'provider.disconnected'; reason?: string })
  | (ProviderEventBase & { type: 'provider.selected'; agentId: string; projectId?: string })
  | (ProviderEventBase & {
      type: 'provider.execution.started'
      agentId: string
      missionId: string
      projectId: string
    })
  | (ProviderEventBase & {
      type: 'provider.execution.finished'
      agentId: string
      missionId: string
      projectId: string
      ok: boolean
    })
  | (ProviderEventBase & { type: 'provider.error'; message: string })
  | (ProviderEventBase & {
      type: 'manual.prompt'
      agentId: string
      missionId: string
      projectId: string
      sessionId: string
      prompt: string
      destinationLabel: string
      destinationUrl: string
    })
  | (ProviderEventBase & {
      type: 'manual.imported'
      agentId: string
      missionId: string
      projectId: string
      sessionId: string
      artifactCount: number
    })

/**
 * Review events (see src/core/review). Screenshots, annotations and review
 * sessions announce themselves on the same bus; not mission-scoped because
 * reviews can outlive the mission that produced the build.
 */
interface ReviewEventBase {
  id: string
  at: number
  projectId: string
}

export type ReviewRuntimeEvent =
  | (ReviewEventBase & {
      type: 'review.screenshot.imported'
      screenshotId: string
      label: string
      iteration: number
      role: 'reference' | 'current'
    })
  | (ReviewEventBase & { type: 'review.started'; sessionId: string; iteration: number })
  | (ReviewEventBase & {
      type: 'review.annotation.added'
      sessionId: string
      annotationId: string
      text: string
    })
  | (ReviewEventBase & {
      type: 'review.completed'
      sessionId: string
      iteration: number
      recommendation: 'approve' | 'reject' | 'revise'
    })
  | (ReviewEventBase & {
      type: 'review.iteration'
      iteration: number
      status: 'approved' | 'rejected'
    })

export type RuntimeEvent = MissionRuntimeEvent | ProviderLifecycleEvent | ReviewRuntimeEvent

export type RuntimeEventType = RuntimeEvent['type']

export class MissionCancelledError extends Error {
  constructor() {
    super('Mission cancelled')
    this.name = 'MissionCancelledError'
  }
}
