import type { MissionMetricsSnapshot, RuntimeEvent } from '../types'

/**
 * Live mission telemetry, fed by bus events. Powers the CI-style dashboard
 * (current agent/task, iteration, elapsed, health, ETA) and the report.
 */
export class MissionMetrics {
  private startedAt = Date.now()
  private iterationStartedAt = Date.now()
  private iterationDurations: number[] = []
  private artifactsCreated = 0
  private filesChanged = 0
  private agentEvents = 0
  private errorRetries = 0
  private currentAgentId: string | null = null
  private currentTask: string | null = null

  constructor(
    private readonly missionId: string,
    private maxIterations: number
  ) {}

  noteErrorRetry(): void {
    this.errorRetries++
  }

  get retriesSoFar(): number {
    return this.errorRetries
  }

  observe(event: RuntimeEvent, iteration: number): void {
    if (!('missionId' in event) || event.missionId !== this.missionId) return
    switch (event.type) {
      case 'agent.started':
        this.currentAgentId = event.agentId
        this.currentTask = 'Starting'
        this.agentEvents++
        break
      case 'agent.progress':
        this.currentTask = event.label ?? this.currentTask
        this.agentEvents++
        break
      case 'agent.message':
        this.agentEvents++
        break
      case 'agent.artifact':
        this.artifactsCreated++
        if (event.artifact.kind === 'code') this.filesChanged++
        break
      case 'agent.completed':
        this.currentTask = null
        break
      case 'mission.resumed':
        // A new revision pass began.
        this.iterationDurations.push(Date.now() - this.iterationStartedAt)
        this.iterationStartedAt = Date.now()
        break
      default:
        break
    }
    void iteration
  }

  snapshot(iteration: number, settled: boolean): MissionMetricsSnapshot {
    const elapsedMs = Date.now() - this.startedAt
    const avgIteration =
      this.iterationDurations.length > 0
        ? this.iterationDurations.reduce((a, b) => a + b, 0) / this.iterationDurations.length
        : null
    const remainingIterations = Math.max(0, this.maxIterations - iteration)
    return {
      missionId: this.missionId,
      iteration,
      startedAt: this.startedAt,
      elapsedMs,
      artifactsCreated: this.artifactsCreated,
      filesChanged: this.filesChanged,
      agentEvents: this.agentEvents,
      health: settled
        ? 'healthy'
        : this.errorRetries === 0
          ? 'healthy'
          : this.errorRetries <= 1
            ? 'degraded'
            : 'failing',
      estimatedRemainingMs:
        settled || avgIteration === null ? null : Math.round(avgIteration * remainingIterations),
      currentAgentId: settled ? null : this.currentAgentId,
      currentTask: settled ? null : this.currentTask
    }
  }
}
