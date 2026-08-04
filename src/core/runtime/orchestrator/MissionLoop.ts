import type { AgentRuntime } from '../AgentRuntime'
import type { Mission, MissionStage, RuntimeEvent } from '../types'
import { ApprovalEngine } from './ApprovalEngine'
import type { LoopPolicy } from './LoopPolicy'
import { MissionMetrics } from './MissionMetrics'
import { deriveLessons, type MissionOutcome, type MissionReportData } from './MissionReport'
import { retryDelay, shouldRetryError } from './RetryStrategy'
import { buildRevisionPlan } from './RevisionPlan'

export interface LoopPorts {
  saveCheckpoint(checkpoint: {
    missionId: string
    projectId: string
    stage: MissionStage
    iteration: number
    artifactCount: number
  }): void
  onSettled(report: MissionReportData): void
}

/**
 * Drives ONE mission to completion: consumes bus events, consults the
 * ApprovalEngine after every verdict, generates revision plans, schedules
 * automatic retries, checkpoints every stage, and emits live metrics.
 * Fully provider-blind — it only sees runtime events and the Agent facade.
 */
export class MissionLoop {
  private readonly approval: ApprovalEngine
  private readonly metrics: MissionMetrics
  private readonly rejectionReasons: string[] = []
  private revisionPlans = 0
  private agentErrored = false
  private settled = false
  private pendingRetry: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly runtime: AgentRuntime,
    private readonly missionId: string,
    private readonly projectId: string,
    private readonly policy: LoopPolicy,
    private readonly ports: LoopPorts
  ) {
    this.approval = new ApprovalEngine(policy)
    this.metrics = new MissionMetrics(missionId, policy.maxIterations)
  }

  get isSettled(): boolean {
    return this.settled
  }

  dispose(): void {
    if (this.pendingRetry) clearTimeout(this.pendingRetry)
    this.settled = true
  }

  handle(event: RuntimeEvent): void {
    if (this.settled || !('missionId' in event) || event.missionId !== this.missionId) return
    // Never react to our own telemetry — that way lies infinite recursion.
    if (event.type === 'mission.metrics') return
    const iteration = this.runtime.missionIteration(this.missionId)
    this.metrics.observe(event, iteration)

    switch (event.type) {
      case 'agent.failed':
        this.agentErrored = true
        break
      case 'agent.completed': {
        const mission = this.mission()
        if (mission) {
          this.ports.saveCheckpoint({
            missionId: this.missionId,
            projectId: this.projectId,
            stage: mission.stage,
            iteration,
            artifactCount: mission.artifacts.length
          })
          this.emitBus({ type: 'mission.checkpoint', stage: mission.stage, iteration })
        }
        break
      }
      case 'mission.failed':
        this.onFailed(event.reason, iteration)
        break
      case 'mission.completed':
        this.onCompleted(iteration)
        break
      case 'mission.cancelled':
        this.settle('cancelled', 'Cancelled by the user')
        break
      default:
        break
    }

    if (!this.settled) {
      this.emitBus({ type: 'mission.metrics', metrics: this.metrics.snapshot(iteration, false) })
    }
  }

  /** QA rejection or agent error — decide between revise, retry and halt. */
  private onFailed(reason: string, iteration: number): void {
    const wasError = this.agentErrored
    this.agentErrored = false

    if (wasError) {
      if (this.policy.stopOnFailure || !shouldRetryError(this.policy.retry, this.metrics.retriesSoFar)) {
        this.settle('halted', `Agent failure: ${reason}`)
        return
      }
      this.metrics.noteErrorRetry()
      this.scheduleRetry(retryDelay(this.policy.retry, this.metrics.retriesSoFar - 1))
      return
    }

    this.rejectionReasons.push(reason)
    const decision = this.approval.onRejected({
      iteration,
      elapsedMs: this.metrics.snapshot(iteration, false).elapsedMs,
      reason
    })
    if (decision.action !== 'revise') {
      this.settle('halted', decision.reason)
      return
    }

    const mission = this.mission()
    if (mission) {
      this.revisionPlans++
      this.runtime.attachArtifact(
        this.missionId,
        buildRevisionPlan({
          missionTitle: mission.title,
          iteration,
          rejectionReason: reason,
          artifacts: mission.artifacts
        }),
        'orchestrator'
      )
    }
    this.scheduleRetry(this.policy.retry.backoffMs)
  }

  /** QA approved — but is the mission actually done per policy? */
  private onCompleted(iteration: number): void {
    const mission = this.mission()
    if (!mission) return
    const decision = this.approval.onApproved({
      iteration,
      elapsedMs: this.metrics.snapshot(iteration, false).elapsedMs,
      artifacts: mission.artifacts
    })

    switch (decision.action) {
      case 'revise':
        this.rejectionReasons.push(decision.reason)
        this.runtime.requestRevision(this.missionId, decision.reason)
        break // requestRevision emits mission.failed → onFailed loops.
      case 'await-approval':
        this.emitBus({ type: 'mission.awaiting-approval', iteration })
        this.settle('awaiting-approval', decision.reason, decision.overallScore)
        break
      default:
        this.settle('completed', decision.reason, decision.overallScore)
    }
  }

  private scheduleRetry(delayMs: number): void {
    if (this.pendingRetry) clearTimeout(this.pendingRetry)
    this.pendingRetry = setTimeout(() => {
      if (!this.settled) this.runtime.retryMission(this.missionId)
    }, delayMs)
  }

  private settle(outcome: MissionOutcome, reason: string, qualityScore: number | null = null): void {
    if (this.settled) return
    this.settled = true
    if (this.pendingRetry) clearTimeout(this.pendingRetry)

    const mission = this.mission()
    const iteration = this.runtime.missionIteration(this.missionId)
    const snapshot = this.metrics.snapshot(iteration, true)
    this.emitBus({ type: 'mission.metrics', metrics: snapshot })

    if (!mission) return
    this.ports.onSettled({
      missionId: this.missionId,
      projectId: this.projectId,
      title: mission.title,
      brief: mission.brief,
      outcome,
      outcomeReason: reason,
      iterations: iteration,
      durationMs: snapshot.elapsedMs,
      qualityScore,
      policy: this.policy,
      artifacts: mission.artifacts.map((a) => ({ name: a.name, kind: a.kind, createdBy: a.createdBy })),
      finalScreenshots: mission.artifacts.filter((a) => a.kind === 'image').map((a) => a.name),
      filesGenerated: mission.artifacts.filter((a) => a.kind === 'code').map((a) => a.name),
      revisionPlans: this.revisionPlans,
      timeline: mission.timeline.map((t) => ({ at: t.at, message: t.message, actor: t.actor })),
      reviewHistory: mission.timeline
        .filter((t) => t.type.startsWith('review.') || t.type.startsWith('qa.'))
        .map((t) => ({ message: t.message, at: t.at })),
      lessonsLearned: deriveLessons({
        rejectionReasons: this.rejectionReasons,
        revisionPlanCount: this.revisionPlans,
        iterations: iteration
      }),
      generatedAt: Date.now()
    })
  }

  private mission(): Mission | null {
    return this.runtime.mission(this.missionId)
  }

  private emitBus(
    partial:
      | { type: 'mission.metrics'; metrics: ReturnType<MissionMetrics['snapshot']> }
      | { type: 'mission.checkpoint'; stage: MissionStage; iteration: number }
      | { type: 'mission.awaiting-approval'; iteration: number }
  ): void {
    this.runtime.bus.emit({
      ...partial,
      id: crypto.randomUUID(),
      at: Date.now(),
      missionId: this.missionId,
      projectId: this.projectId
    })
  }
}
