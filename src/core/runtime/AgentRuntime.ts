import type { Agent, AgentDescriptor } from './Agent'
import { EventBus } from './EventBus'
import { createMission, type MissionInput } from './Mission'
import { MissionRunner, type MissionStep } from './MissionRunner'
import type { AgentRole, Mission, MissionSnapshot, MissionStage } from './types'
import { snapshotMission } from './Mission'

/** The default sequential pipeline. Each entry = one agent working a stage. */
const DEFAULT_PIPELINE: { role: AgentRole; stage: MissionStage }[] = [
  { role: 'creative', stage: 'research' },
  { role: 'engineer', stage: 'engineering' },
  { role: 'qa', stage: 'qa' }
]

/**
 * The heart of the application: owns the agent registry, active missions,
 * and the event bus. Providers plug in via `register()`; the UI talks to it
 * exclusively through snapshots and bus events.
 */
export class AgentRuntime {
  readonly bus = new EventBus()
  private agents = new Map<string, Agent>()
  private runners = new Map<string, MissionRunner>()

  // -- agents ---------------------------------------------------------------

  register(agent: Agent): void {
    if (this.agents.has(agent.id)) throw new Error(`Agent already registered: ${agent.id}`)
    this.agents.set(agent.id, agent)
  }

  agentByRole(role: AgentRole): Agent {
    const agent = [...this.agents.values()].find((a) => a.role === role)
    if (!agent) throw new Error(`No agent registered for role: ${role}`)
    return agent
  }

  describeAgents(): AgentDescriptor[] {
    return [...this.agents.values()].map((a) => a.snapshot())
  }

  // -- missions -------------------------------------------------------------

  /** Creates a mission and starts its pipeline. Rejects if one is active. */
  startMission(input: MissionInput): MissionSnapshot {
    if (this.activeMission(input.projectId)) {
      throw new Error('A mission is already in progress for this project')
    }

    const mission = createMission(input)
    const steps: MissionStep[] = DEFAULT_PIPELINE.map(({ role, stage }) => ({
      agent: this.agentByRole(role),
      stage
    }))

    const runner = new MissionRunner(mission, steps, this.bus)
    this.runners.set(mission.id, runner)
    void runner.run().catch((error) => {
      console.error('[AgentRuntime] mission crashed', error)
    })
    return snapshotMission(mission)
  }

  pauseMission(missionId: string): void {
    this.runner(missionId).pause()
  }

  resumeMission(missionId: string): void {
    this.runner(missionId).resume()
  }

  cancelMission(missionId: string): void {
    this.runner(missionId).cancel()
  }

  retryMission(missionId: string): void {
    void this.runner(missionId)
      .retry()
      .catch((error) => {
        console.error('[AgentRuntime] retry crashed', error)
      })
  }

  /** Build iteration counter for a mission (1-based). */
  missionIteration(missionId: string): number {
    return this.runners.get(missionId)?.iteration ?? 1
  }

  /** Attach an artifact outside any agent step (revision plans, reports…). */
  attachArtifact(
    missionId: string,
    draft: { name: string; kind: Mission['artifacts'][number]['kind']; description: string; content: string },
    createdBy: string
  ): void {
    this.runner(missionId).attachArtifact(draft, createdBy)
  }

  /** Send a settled mission back to engineering (revision / rollback). */
  requestRevision(missionId: string, reason: string): void {
    this.runner(missionId).markForRevision(reason)
  }

  mission(missionId: string): Mission | null {
    return this.runners.get(missionId)?.mission ?? null
  }

  missionSnapshot(missionId: string): MissionSnapshot | null {
    const mission = this.mission(missionId)
    return mission ? snapshotMission(mission) : null
  }

  /** The running or paused mission for a project, if any. */
  activeMission(projectId: string): MissionSnapshot | null {
    for (const runner of this.runners.values()) {
      const m = runner.mission
      if (m.projectId === projectId && (m.status === 'running' || m.status === 'paused')) {
        return snapshotMission(m)
      }
    }
    return null
  }

  private runner(missionId: string): MissionRunner {
    const runner = this.runners.get(missionId)
    if (!runner) throw new Error(`Unknown mission: ${missionId}`)
    return runner
  }
}
