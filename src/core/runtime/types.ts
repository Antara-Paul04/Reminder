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

export type RuntimeEvent =
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

export type RuntimeEventType = RuntimeEvent['type']

export class MissionCancelledError extends Error {
  constructor() {
    super('Mission cancelled')
    this.name = 'MissionCancelledError'
  }
}
