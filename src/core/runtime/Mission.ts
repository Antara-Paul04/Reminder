import type {
  Mission,
  MissionReference,
  MissionSnapshot,
  MissionStage,
  MissionTimelineEntry
} from './types'
import { MISSION_STAGES } from './types'

export interface MissionInput {
  projectId: string
  title: string
  brief: string
  notes: string[]
  references: MissionReference[]
}

export function createMission(input: MissionInput): Mission {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    title: input.title,
    brief: input.brief,
    notes: input.notes,
    references: input.references,
    artifacts: [],
    timeline: [],
    status: 'running',
    stage: 'research',
    failedStepIndex: null,
    createdAt: now,
    updatedAt: now
  }
}

/** Immutable view safe to hand to agents and ship over IPC. */
export function snapshotMission(mission: Mission): MissionSnapshot {
  const { artifacts, timeline, ...rest } = mission
  void timeline
  return { ...rest, artifactCount: artifacts.length }
}

export function stageIndex(stage: MissionStage): number {
  return MISSION_STAGES.indexOf(stage)
}

/** True if `stage` is at or beyond `other` in the pipeline. */
export function stageAtLeast(stage: MissionStage, other: MissionStage): boolean {
  return stageIndex(stage) >= stageIndex(other)
}

export function appendTimelineEntry(
  mission: Mission,
  type: string,
  message: string,
  actor: string
): MissionTimelineEntry {
  const entry: MissionTimelineEntry = {
    id: crypto.randomUUID(),
    type,
    message,
    actor,
    at: Date.now()
  }
  mission.timeline.push(entry)
  mission.updatedAt = entry.at
  return entry
}
