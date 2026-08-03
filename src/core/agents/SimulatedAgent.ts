import type { Agent } from '../runtime/Agent'
import type {
  AgentEvent,
  AgentRole,
  AgentStatus,
  ArtifactDraft,
  MissionContext,
  MissionStage
} from '../runtime/types'
import { MissionCancelledError } from '../runtime/types'

/** One beat of a simulated performance: wait, then emit. */
export interface SimStep {
  /** Milliseconds to wait before emitting (scaled by `speed`). */
  after: number
  event: AgentEvent
}

export interface SimulatedAgentOptions {
  id: string
  name: string
  role: AgentRole
  description: string
  /** Multiplier on step delays; <1 speeds playback up (tests use ~0.01). */
  speed?: number
}

/**
 * Base class for simulated providers. Subclasses supply a script — a timed
 * sequence of AgentEvents derived from the mission context — and this class
 * streams it with realistic pacing, honouring cancellation.
 *
 * Deliberately implements the exact same `Agent` contract a real provider
 * will: swapping a simulator for Claude Code changes nothing upstream.
 */
export abstract class SimulatedAgent implements Agent {
  readonly id: string
  readonly name: string
  readonly role: AgentRole
  readonly provider = 'simulated'
  readonly description: string
  status: AgentStatus = 'idle'
  private readonly speed: number

  constructor(options: SimulatedAgentOptions) {
    this.id = options.id
    this.name = options.name
    this.role = options.role
    this.description = options.description
    this.speed = options.speed ?? 1
  }

  protected abstract script(context: MissionContext): SimStep[]

  async *execute(context: MissionContext): AsyncGenerator<AgentEvent> {
    for (const step of this.script(context)) {
      await this.sleep(step.after, context.signal)
      yield step.event
    }
  }

  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    const jittered = ms * this.speed * (0.8 + Math.random() * 0.4)
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new MissionCancelledError())
        return
      }
      const timer = setTimeout(() => resolve(), jittered)
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(new MissionCancelledError())
        },
        { once: true }
      )
    })
  }
}

/** Shorthand builders to keep scripts readable. */
export const emit = {
  status: (after: number, status: AgentStatus): SimStep => ({ after, event: { type: 'status', status } }),
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
