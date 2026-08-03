import { listArtifacts } from '../db/artifacts'
import { listMissions } from '../db/missions'
import { buildMissionInput } from '../runtime/context'
import { getRuntime } from '../runtime'
import { handle } from './registry'

export function registerMissionHandlers(): void {
  handle('missions:list', (projectId) => listMissions(projectId))

  handle('missions:start', (projectId) => {
    const snapshot = getRuntime().startMission(buildMissionInput(projectId))
    return {
      id: snapshot.id,
      projectId: snapshot.projectId,
      title: snapshot.title,
      brief: snapshot.brief,
      status: snapshot.status,
      stage: snapshot.stage,
      failedStepIndex: snapshot.failedStepIndex,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt
    }
  })

  handle('missions:pause', (missionId) => getRuntime().pauseMission(missionId))
  handle('missions:resume', (missionId) => getRuntime().resumeMission(missionId))
  handle('missions:cancel', (missionId) => getRuntime().cancelMission(missionId))
  handle('missions:retry', (missionId) => getRuntime().retryMission(missionId))

  handle('missions:artifacts', (missionId) => listArtifacts(missionId))
}
