import type { AgentRuntime } from '../AgentRuntime'
import type { MissionInput } from '../Mission'
import type { MissionSnapshot, MissionStage } from '../types'
import { normalizeLoopPolicy, type LoopPolicy } from './LoopPolicy'
import { MissionLoop } from './MissionLoop'
import {
  renderReportJson,
  renderReportMarkdown,
  type MissionReportData
} from './MissionReport'

export interface OrchestratorPorts {
  /** Current mission policy (Settings → Missions). */
  policy(): Partial<LoopPolicy>
  saveCheckpoint(checkpoint: {
    missionId: string
    projectId: string
    stage: MissionStage
    iteration: number
    artifactCount: number
  }): void
  /** Persist + optionally export a settled mission's report. */
  storeReport(report: MissionReportData, rendered: { markdown: string; json: string }): void
  notify(title: string, body: string): void
}

/**
 * Owns the autonomous mission lifecycle. One subscription to the runtime
 * bus routes events to per-mission loops; the orchestrator itself never
 * touches agents or providers — provider independence is structural.
 */
export class MissionOrchestrator {
  private readonly loops = new Map<string, MissionLoop>()

  constructor(
    private readonly runtime: AgentRuntime,
    private readonly ports: OrchestratorPorts
  ) {
    runtime.bus.on((event) => {
      if (!('missionId' in event)) return
      const loop = this.loops.get(event.missionId)
      if (!loop) return
      loop.handle(event)
      if (loop.isSettled) this.loops.delete(event.missionId)
    })
  }

  /**
   * Start a mission under the current policy. With `autonomous` enabled the
   * loop drives it to completion; otherwise this is a classic manual run.
   */
  start(input: MissionInput): MissionSnapshot {
    const policy = normalizeLoopPolicy(this.ports.policy())
    const snapshot = this.runtime.startMission(input)
    if (policy.autonomous) this.attach(snapshot.id, snapshot.projectId, policy)
    return snapshot
  }

  /** Adopt an already-running mission into the autonomous loop. */
  attach(missionId: string, projectId: string, policy: LoopPolicy): void {
    if (this.loops.has(missionId)) return
    this.loops.set(
      missionId,
      new MissionLoop(this.runtime, missionId, projectId, policy, {
        saveCheckpoint: (checkpoint) => this.ports.saveCheckpoint(checkpoint),
        onSettled: (report) => {
          this.ports.storeReport(report, {
            markdown: renderReportMarkdown(report),
            json: renderReportJson(report)
          })
          this.ports.notify(
            `Mission ${report.outcome}`,
            `${report.title} — ${report.iterations} iteration${report.iterations === 1 ? '' : 's'}, ${Math.round(report.durationMs / 60000)}m`
          )
        }
      })
    )
  }

  /** Detach (e.g. user cancels autonomy for a mission). */
  detach(missionId: string): void {
    this.loops.get(missionId)?.dispose()
    this.loops.delete(missionId)
  }

  isAutonomous(missionId: string): boolean {
    return this.loops.has(missionId)
  }
}
