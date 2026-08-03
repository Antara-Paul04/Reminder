import type { Agent } from './Agent'
import type { EventBus } from './EventBus'
import type { AgentEvent, Mission, MissionStage, RuntimeEvent } from './types'
import { MissionCancelledError } from './types'
import { appendTimelineEntry, snapshotMission } from './Mission'

/** One unit of the pipeline: an agent working within a mission stage. */
export interface MissionStep {
  agent: Agent
  stage: MissionStage
}

/** Lets execution be suspended between events without losing generator state. */
class Gate {
  private blocked: Promise<void> | null = null
  private release: (() => void) | null = null

  pause(): void {
    if (this.blocked) return
    this.blocked = new Promise((resolve) => {
      this.release = resolve
    })
  }

  resume(): void {
    this.release?.()
    this.blocked = null
    this.release = null
  }

  async wait(): Promise<void> {
    if (this.blocked) await this.blocked
  }
}

/**
 * Executes a mission's pipeline of steps sequentially, consuming each
 * agent's event stream and translating it into runtime events on the bus.
 *
 * Sequential today by design; because steps are self-contained
 * (agent + stage + artifact inputs), a parallel scheduler only needs to
 * replace the `for` loop in `run()`.
 */
export class MissionRunner {
  private readonly gate = new Gate()
  private abort = new AbortController()
  private attempts: number[]
  private running = false

  constructor(
    readonly mission: Mission,
    private readonly steps: MissionStep[],
    private readonly bus: EventBus
  ) {
    this.attempts = steps.map(() => 0)
  }

  // -- controls -------------------------------------------------------------

  async run(fromStep = 0): Promise<void> {
    if (this.running) throw new Error('Mission is already running')
    this.running = true
    this.abort = new AbortController()
    this.mission.status = 'running'
    this.mission.failedStepIndex = null

    if (fromStep === 0) {
      this.emit({ type: 'mission.started', mission: snapshotMission(this.mission) })
      this.timeline('mission.started', `Mission started: ${this.mission.title}`, 'AI Studio')
    } else {
      this.emit({ type: 'mission.resumed' })
      this.timeline('mission.retried', `Retrying from ${this.steps[fromStep].agent.name}`, 'AI Studio')
    }

    try {
      for (let i = fromStep; i < this.steps.length; i++) {
        await this.executeStep(i)
      }
      this.setStage('complete')
      this.mission.status = 'completed'
      this.emit({ type: 'mission.completed' })
      this.timeline('mission.completed', `Mission complete: ${this.mission.title}`, 'AI Studio')
    } catch (error) {
      if (error instanceof MissionCancelledError) {
        this.mission.status = 'cancelled'
        this.emit({ type: 'mission.cancelled' })
        this.timeline('mission.cancelled', 'Mission cancelled', 'AI Studio')
      } else if (!(error instanceof StepFailedError)) {
        throw error
      }
      // StepFailedError: state was already recorded by executeStep.
    } finally {
      this.running = false
      this.gate.resume()
    }
  }

  pause(): void {
    if (this.mission.status !== 'running') return
    this.gate.pause()
    this.mission.status = 'paused'
    this.emit({ type: 'mission.paused' })
  }

  resume(): void {
    if (this.mission.status !== 'paused') return
    this.mission.status = 'running'
    this.gate.resume()
    this.emit({ type: 'mission.resumed' })
  }

  cancel(): void {
    if (this.mission.status !== 'running' && this.mission.status !== 'paused') return
    this.abort.abort()
    this.gate.resume()
  }

  /** Re-runs the pipeline from the step recorded as failed. */
  async retry(): Promise<void> {
    const from = this.mission.failedStepIndex
    if (this.mission.status !== 'failed' || from === null) {
      throw new Error('Mission has no failed step to retry')
    }
    await this.run(from)
  }

  get isActive(): boolean {
    return this.running
  }

  // -- internals ------------------------------------------------------------

  private async executeStep(index: number): Promise<void> {
    const { agent, stage } = this.steps[index]
    const attempt = this.attempts[index]++
    this.setStage(stage)

    this.emit({ type: 'agent.started', agentId: agent.id, role: agent.role })
    this.timeline('agent.started', `${agent.name} picked up the mission`, agent.name)
    this.setAgentStatus(agent, 'working')

    const context = {
      mission: snapshotMission(this.mission),
      brief: this.mission.brief,
      notes: this.mission.notes,
      references: this.mission.references,
      artifacts: [...this.mission.artifacts],
      attempt,
      signal: this.abort.signal
    }

    const stream = agent.execute(context)
    try {
      for await (const event of stream) {
        await this.gate.wait()
        if (this.abort.signal.aborted) throw new MissionCancelledError()
        this.handleAgentEvent(agent, index, event)
      }
    } catch (error) {
      await stream.return?.(undefined)
      if (error instanceof MissionCancelledError || error instanceof StepFailedError) {
        if (error instanceof MissionCancelledError) this.setAgentStatus(agent, 'idle')
        throw error
      }
      this.failStep(agent, index, error instanceof Error ? error.message : String(error))
    }

    this.setAgentStatus(agent, 'complete')
    this.emit({ type: 'agent.completed', agentId: agent.id })
    this.timeline('agent.completed', `${agent.name} finished ${describeStage(stage)}`, agent.name)
  }

  private handleAgentEvent(agent: Agent, stepIndex: number, event: AgentEvent): void {
    switch (event.type) {
      case 'status':
        this.setAgentStatus(agent, event.status)
        break
      case 'message':
        this.emit({ type: 'agent.message', agentId: agent.id, text: event.text })
        break
      case 'progress':
        this.emit({
          type: 'agent.progress',
          agentId: agent.id,
          percent: event.percent,
          label: event.label
        })
        break
      case 'stage':
        this.setStage(event.stage)
        break
      case 'artifact': {
        const artifact = {
          ...event.artifact,
          id: crypto.randomUUID(),
          missionId: this.mission.id,
          createdBy: agent.id,
          createdAt: Date.now()
        }
        this.mission.artifacts.push(artifact)
        this.mission.updatedAt = artifact.createdAt
        this.emit({ type: 'agent.artifact', agentId: agent.id, artifact })
        this.timeline('artifact.created', `${agent.name} produced ${artifact.name}`, agent.name)
        break
      }
      case 'verdict':
        if (!event.approved) {
          // Rejected work sends the pipeline back to the previous step —
          // the reviewer completed its job; the reviewed work is what failed.
          const reworkStep = Math.max(stepIndex - 1, 0)
          this.setAgentStatus(agent, 'complete')
          this.emit({ type: 'agent.completed', agentId: agent.id })
          this.failStep(null, reworkStep, event.reason ?? 'Rejected by review')
        }
        break
    }
  }

  private failStep(agent: Agent | null, stepIndex: number, reason: string): never {
    if (agent) {
      this.setAgentStatus(agent, 'failed')
      this.emit({ type: 'agent.failed', agentId: agent.id, reason })
      this.timeline('agent.failed', `${agent.name} failed: ${reason}`, agent.name)
    }
    this.mission.status = 'failed'
    this.mission.failedStepIndex = stepIndex
    this.emit({ type: 'mission.failed', reason, failedStepIndex: stepIndex })
    this.timeline('mission.failed', `Mission needs attention: ${reason}`, 'AI Studio')
    throw new StepFailedError(reason)
  }

  private setStage(stage: MissionStage): void {
    if (this.mission.stage === stage) return
    this.mission.stage = stage
    this.mission.updatedAt = Date.now()
    this.emit({ type: 'mission.stage', stage })
  }

  private setAgentStatus(agent: Agent, status: Agent['status']): void {
    if (agent.status === status) return
    agent.status = status
    this.emit({ type: 'agent.status', agentId: agent.id, status })
  }

  private timeline(type: string, message: string, actor: string): void {
    const entry = appendTimelineEntry(this.mission, type, message, actor)
    this.emit({ type: 'timeline.entry', entry })
  }

  private emit(partial: DistributiveOmit<RuntimeEvent, 'id' | 'at' | 'missionId' | 'projectId'>): void {
    this.bus.emit({
      ...partial,
      id: crypto.randomUUID(),
      at: Date.now(),
      missionId: this.mission.id,
      projectId: this.mission.projectId
    } as RuntimeEvent)
  }
}

/** Internal control-flow marker; mission state is recorded before it throws. */
class StepFailedError extends Error {}

function describeStage(stage: MissionStage): string {
  return stage.replace('-', ' ')
}

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never
