import { listArtifacts } from '../db/artifacts'
import { getMissionRecord, listMissions } from '../db/missions'
import {
  getMissionReport,
  listCheckpoints,
  setMissionArchived
} from '../db/orchestrator'
import { buildMissionInput } from '../runtime/context'
import { getRuntime } from '../runtime'
import { getMissionPolicy, getOrchestrator, setMissionPolicy } from '../runtime/orchestrator'
import { handle } from './registry'

export function registerMissionHandlers(): void {
  handle('missions:list', (projectId) => listMissions(projectId))

  handle('missions:start', (projectId) => {
    const snapshot = getOrchestrator().start(buildMissionInput(projectId))
    return {
      id: snapshot.id,
      projectId: snapshot.projectId,
      title: snapshot.title,
      brief: snapshot.brief,
      status: snapshot.status,
      stage: snapshot.stage,
      failedStepIndex: snapshot.failedStepIndex,
      archived: false,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt
    }
  })

  handle('missions:pause', (missionId) => getRuntime().pauseMission(missionId))
  handle('missions:resume', (missionId) => getRuntime().resumeMission(missionId))
  handle('missions:cancel', (missionId) => {
    getOrchestrator().detach(missionId)
    getRuntime().cancelMission(missionId)
  })
  handle('missions:retry', (missionId) => {
    // Manual retry re-adopts the mission into the loop when policy allows.
    const policy = getMissionPolicy()
    const snapshot = getRuntime().missionSnapshot(missionId)
    if (policy.autonomous && snapshot) {
      getOrchestrator().attach(missionId, snapshot.projectId, policy)
    }
    getRuntime().retryMission(missionId)
  })

  handle('missions:artifacts', (missionId) => listArtifacts(missionId))

  handle('missions:policy:get', () => getMissionPolicy())
  handle('missions:policy:set', (partial) => setMissionPolicy(partial))

  handle('missions:report', (missionId) => getMissionReport(missionId))
  handle('missions:checkpoints', (missionId) => listCheckpoints(missionId))
  handle('missions:archive', (missionId, archived) => setMissionArchived(missionId, archived))

  /** Replay: fresh autonomous run of the same project input. */
  handle('missions:duplicate', (missionId) => {
    const source = getMissionRecord(missionId)
    if (!source) throw new Error(`Unknown mission: ${missionId}`)
    const snapshot = getOrchestrator().start(buildMissionInput(source.projectId))
    return snapshot.id
  })

  /** Rollback: send an in-memory settled mission back to engineering. */
  handle('missions:rollback', (missionId, reason) => {
    const runtime = getRuntime()
    const snapshot = runtime.missionSnapshot(missionId)
    if (!snapshot) throw new Error('Mission is no longer in memory')
    const policy = getMissionPolicy()
    if (policy.autonomous) getOrchestrator().attach(missionId, snapshot.projectId, policy)
    runtime.requestRevision(missionId, reason ?? 'Rolled back to previous iteration')
    if (!policy.autonomous) runtime.retryMission(missionId)
  })
}
