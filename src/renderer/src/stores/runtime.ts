import { create } from 'zustand'
import type {
  AgentDescriptor,
  AgentStatus,
  MissionRecord,
  RuntimeEvent
} from '@shared/types'
import { api } from '@/lib/api'
import { refreshTimeline } from '@/stores/timeline'

export interface TranscriptLine {
  id: string
  agentId: string
  kind: 'message' | 'artifact' | 'error'
  text: string
  at: number
}

interface RuntimeState {
  projectId: string | null
  agents: AgentDescriptor[]
  /** Missions for the active project, newest first. */
  missions: MissionRecord[]
  /** Live transcript per mission id (session-local; not persisted). */
  transcripts: Record<string, TranscriptLine[]>
  /** Latest progress per agent id, cleared when a mission ends. */
  progress: Record<string, { percent: number; label?: string }>
  /** Bumped whenever an artifact lands, so data panels reload. */
  artifactVersion: number

  init: (projectId: string | null) => Promise<void>
  handleEvent: (event: RuntimeEvent) => void
  startMission: (projectId: string) => Promise<void>
}

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  projectId: null,
  agents: [],
  missions: [],
  transcripts: {},
  progress: {},
  artifactVersion: 0,

  init: async (projectId) => {
    const [agents, missions] = await Promise.all([
      api.agents.list(),
      projectId ? api.missions.list(projectId) : Promise.resolve([])
    ])
    set({ projectId, agents, missions })
  },

  startMission: async (projectId) => {
    const record = await api.missions.start(projectId)
    set((s) => ({ missions: [record, ...s.missions.filter((m) => m.id !== record.id)] }))
  },

  handleEvent: (event) => {
    const state = get()

    // Agent status is global — agents are shared across projects.
    if (event.type === 'agent.status') {
      set({
        agents: state.agents.map((a) =>
          a.id === event.agentId ? { ...a, status: event.status as AgentStatus } : a
        )
      })
      return
    }

    if (event.projectId !== state.projectId) return

    switch (event.type) {
      case 'mission.started':
        set((s) => ({
          missions: [
            missionFromSnapshot(event),
            ...s.missions.filter((m) => m.id !== event.missionId)
          ]
        }))
        break

      case 'mission.stage':
        patchMission(set, event.missionId, { stage: event.stage })
        break
      case 'mission.paused':
        patchMission(set, event.missionId, { status: 'paused' })
        break
      case 'mission.resumed':
        patchMission(set, event.missionId, { status: 'running' })
        break
      case 'mission.completed':
        patchMission(set, event.missionId, { status: 'completed' })
        set({ progress: {} })
        break
      case 'mission.cancelled':
        patchMission(set, event.missionId, { status: 'cancelled' })
        set({ progress: {} })
        break
      case 'mission.failed':
        patchMission(set, event.missionId, {
          status: 'failed',
          failedStepIndex: event.failedStepIndex
        })
        set({ progress: {} })
        appendLine(set, event.missionId, {
          id: event.id,
          agentId: 'system',
          kind: 'error',
          text: event.reason,
          at: event.at
        })
        break

      case 'agent.message':
        appendLine(set, event.missionId, {
          id: event.id,
          agentId: event.agentId,
          kind: 'message',
          text: event.text,
          at: event.at
        })
        break

      case 'agent.progress':
        set((s) => ({
          progress: {
            ...s.progress,
            [event.agentId]: { percent: event.percent, label: event.label }
          }
        }))
        break

      case 'agent.artifact':
        set((s) => ({ artifactVersion: s.artifactVersion + 1 }))
        appendLine(set, event.missionId, {
          id: event.id,
          agentId: event.agentId,
          kind: 'artifact',
          text: event.artifact.name,
          at: event.at
        })
        break

      case 'timeline.entry':
        refreshTimeline(event.projectId)
        break

      default:
        break
    }
  }
}))

type Setter = (fn: (s: RuntimeState) => Partial<RuntimeState>) => void

function patchMission(set: Setter, missionId: string, patch: Partial<MissionRecord>): void {
  set((s) => ({
    missions: s.missions.map((m) => (m.id === missionId ? { ...m, ...patch } : m))
  }))
}

function appendLine(set: Setter, missionId: string, line: TranscriptLine): void {
  set((s) => ({
    transcripts: {
      ...s.transcripts,
      [missionId]: [...(s.transcripts[missionId] ?? []), line]
    }
  }))
}

function missionFromSnapshot(
  event: Extract<RuntimeEvent, { type: 'mission.started' }>
): MissionRecord {
  const m = event.mission
  return {
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    brief: m.brief,
    status: m.status,
    stage: m.stage,
    failedStepIndex: m.failedStepIndex,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt
  }
}
