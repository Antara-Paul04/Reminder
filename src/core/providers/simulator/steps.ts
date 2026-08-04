import type {
  AgentEvent,
  AgentStatus,
  ArtifactDraft,
  MissionStage
} from '../../runtime/types'

/** One beat of a simulated performance: wait, then emit. */
export interface SimStep {
  /** Milliseconds to wait before emitting (scaled by simulator speed). */
  after: number
  event: AgentEvent
}

/** Shorthand builders to keep scripts readable. */
export const emit = {
  status: (after: number, status: AgentStatus): SimStep => ({
    after,
    event: { type: 'status', status }
  }),
  message: (after: number, text: string): SimStep => ({ after, event: { type: 'message', text } }),
  progress: (after: number, percent: number, label?: string): SimStep => ({
    after,
    event: { type: 'progress', percent, label }
  }),
  stage: (after: number, stage: MissionStage): SimStep => ({ after, event: { type: 'stage', stage } }),
  artifact: (after: number, artifact: ArtifactDraft): SimStep => ({
    after,
    event: { type: 'artifact', artifact }
  }),
  verdict: (after: number, approved: boolean, reason?: string): SimStep => ({
    after,
    event: { type: 'verdict', approved, reason }
  })
}
