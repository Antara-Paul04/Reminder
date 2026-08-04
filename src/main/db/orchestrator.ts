import { randomUUID } from 'crypto'
import type { MissionCheckpoint, MissionReportData } from '@shared/types'
import { getDb } from './index'

export function insertCheckpoint(checkpoint: Omit<MissionCheckpoint, 'id' | 'createdAt'>): void {
  getDb()
    .prepare(
      `INSERT INTO mission_checkpoints (id, mission_id, project_id, stage, iteration, artifact_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      checkpoint.missionId,
      checkpoint.projectId,
      checkpoint.stage,
      checkpoint.iteration,
      checkpoint.artifactCount,
      Date.now()
    )
}

export function listCheckpoints(missionId: string): MissionCheckpoint[] {
  const rows = getDb()
    .prepare('SELECT * FROM mission_checkpoints WHERE mission_id = ? ORDER BY created_at')
    .all(missionId) as {
    id: string
    mission_id: string
    project_id: string
    stage: string
    iteration: number
    artifact_count: number
    created_at: number
  }[]
  return rows.map((row) => ({
    id: row.id,
    missionId: row.mission_id,
    projectId: row.project_id,
    stage: row.stage as MissionCheckpoint['stage'],
    iteration: row.iteration,
    artifactCount: row.artifact_count,
    createdAt: row.created_at
  }))
}

export function storeMissionReport(report: MissionReportData, markdown: string): void {
  getDb()
    .prepare(
      `INSERT INTO mission_reports (mission_id, project_id, data, markdown, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(mission_id) DO UPDATE SET data = excluded.data, markdown = excluded.markdown`
    )
    .run(report.missionId, report.projectId, JSON.stringify(report), markdown, Date.now())
}

export function getMissionReport(
  missionId: string
): { data: MissionReportData; markdown: string } | null {
  const row = getDb()
    .prepare('SELECT data, markdown FROM mission_reports WHERE mission_id = ?')
    .get(missionId) as { data: string; markdown: string } | undefined
  if (!row) return null
  try {
    return { data: JSON.parse(row.data) as MissionReportData, markdown: row.markdown }
  } catch {
    return null
  }
}

export function setMissionArchived(missionId: string, archived: boolean): void {
  getDb()
    .prepare('UPDATE missions SET archived = ?, updated_at = ? WHERE id = ?')
    .run(archived ? 1 : 0, Date.now(), missionId)
}
