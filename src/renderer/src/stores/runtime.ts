import { create } from 'zustand'
import type {
  AgentDescriptor,
  AgentStatus,
  MissionMetricsSnapshot,
  MissionRecord,
  PendingManualRequest,
  ProviderDescriptor,
  RuntimeEvent
} from '@shared/types'
import { api } from '@/lib/api'
import { useReviewStore } from '@/stores/review'
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
  providers: ProviderDescriptor[]
  /** Missions for the active project, newest first. */
  missions: MissionRecord[]
  /** Live transcript per mission id (session-local; not persisted). */
  transcripts: Record<string, TranscriptLine[]>
  /** Latest progress per agent id, cleared when a mission ends. */
  progress: Record<string, { percent: number; label?: string }>
  /** Bumped whenever an artifact lands, so data panels reload. */
  artifactVersion: number
  /** Manual interaction awaiting the user (prompt hand-off), if any. */
  pendingManual: PendingManualRequest | null
  /** Latest orchestration telemetry per mission id. */
  metrics: Record<string, MissionMetricsSnapshot>

  init: (projectId: string | null) => Promise<void>
  handleEvent: (event: RuntimeEvent) => void
  startMission: (projectId: string) => Promise<void>
  selectProvider: (agentId: string, providerId: string) => Promise<void>
}

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  projectId: null,
  agents: [],
  providers: [],
  missions: [],
  transcripts: {},
  progress: {},
  artifactVersion: 0,
  pendingManual: null,
  metrics: {},

  init: async (projectId) => {
    const [agents, providers, missions, pending] = await Promise.all([
      api.agents.list(),
      api.providers.list(),
      projectId ? api.missions.list(projectId) : Promise.resolve([]),
      projectId ? api.manual.pending(projectId) : Promise.resolve([])
    ])
    set({ projectId, agents, providers, missions, pendingManual: pending[0] ?? null })
  },

  selectProvider: async (agentId, providerId) => {
    await api.providers.select(agentId, providerId, get().projectId ?? undefined)
    // Refresh agents so provider/providerName reflect the new assignment.
    set({ agents: await api.agents.list() })
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

    // Provider lifecycle events are global too (not always project-scoped).
    if (
      event.type === 'provider.connected' ||
      event.type === 'provider.disconnected' ||
      event.type === 'provider.error'
    ) {
      const status =
        event.type === 'provider.connected'
          ? 'connected'
          : event.type === 'provider.disconnected'
            ? 'disconnected'
            : 'error'
      set({
        providers: state.providers.map((p) =>
          p.id === event.providerId ? { ...p, status } : p
        )
      })
      return
    }

    if (event.type === 'provider.selected') {
      set({
        agents: state.agents.map((a) =>
          a.id === event.agentId
            ? {
                ...a,
                provider: event.providerId,
                providerName:
                  state.providers.find((p) => p.id === event.providerId)?.name ?? event.providerId
              }
            : a
        )
      })
      if (event.projectId && event.projectId === state.projectId) refreshTimeline(event.projectId)
      return
    }

    if (event.type === 'provider.execution.started' || event.type === 'provider.execution.finished') {
      if (event.projectId === state.projectId) refreshTimeline(event.projectId)
      return
    }

    if (event.type === 'manual.prompt') {
      if (event.projectId !== state.projectId) return
      set({
        pendingManual: {
          sessionId: event.sessionId,
          providerId: event.providerId,
          providerName: event.destinationLabel,
          agentId: event.agentId,
          missionId: event.missionId,
          projectId: event.projectId,
          prompt: event.prompt,
          destinationLabel: event.destinationLabel,
          destinationUrl: event.destinationUrl,
          createdAt: event.at
        }
      })
      refreshTimeline(event.projectId)
      return
    }

    if (event.type === 'manual.imported') {
      if (state.pendingManual?.sessionId === event.sessionId) set({ pendingManual: null })
      if (event.projectId === state.projectId) refreshTimeline(event.projectId)
      return
    }

    if (event.type.startsWith('review.')) {
      if ('projectId' in event && event.projectId === state.projectId) {
        void useReviewStore.getState().refresh()
        refreshTimeline(event.projectId)
      }
      return
    }

    if (event.projectId !== state.projectId) return

    switch (event.type) {
      case 'mission.metrics':
        set((s) => ({ metrics: { ...s.metrics, [event.missionId]: event.metrics } }))
        break

      case 'mission.checkpoint':
      case 'mission.awaiting-approval':
        refreshTimeline(event.projectId)
        break

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
        set((s) => ({
          progress: {},
          pendingManual: s.pendingManual?.missionId === event.missionId ? null : s.pendingManual
        }))
        break
      case 'mission.failed':
        patchMission(set, event.missionId, {
          status: 'failed',
          failedStepIndex: event.failedStepIndex
        })
        set((s) => ({
          progress: {},
          pendingManual: s.pendingManual?.missionId === event.missionId ? null : s.pendingManual
        }))
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
    archived: false,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt
  }
}
