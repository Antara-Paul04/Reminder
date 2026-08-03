import type { MissionRecord, MissionStage, MissionStatus } from '@shared/types'
import { getDb } from './index'

interface MissionRow {
  id: string
  project_id: string
  title: string
  brief: string
  status: string
  stage: string
  failed_step_index: number | null
  created_at: number
  updated_at: number
}

function toRecord(row: MissionRow): MissionRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    brief: row.brief,
    status: row.status as MissionStatus,
    stage: row.stage as MissionStage,
    failedStepIndex: row.failed_step_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listMissions(projectId: string): MissionRecord[] {
  const rows = getDb()
    .prepare('SELECT * FROM missions WHERE project_id = ? ORDER BY created_at DESC')
    .all(projectId) as MissionRow[]
  return rows.map(toRecord)
}

export function countMissions(projectId: string): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS n FROM missions WHERE project_id = ?')
    .get(projectId) as { n: number }
  return row.n
}

/** Inserts or refreshes a mission row from a runtime snapshot. */
export function upsertMission(record: MissionRecord): void {
  getDb()
    .prepare(
      `INSERT INTO missions (id, project_id, title, brief, status, stage, failed_step_index, created_at, updated_at)
       VALUES (@id, @projectId, @title, @brief, @status, @stage, @failedStepIndex, @createdAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         status = @status, stage = @stage, failed_step_index = @failedStepIndex, updated_at = @updatedAt`
    )
    .run(record)
}

/** Missions left 'running'/'paused' by a previous app session can never resume. */
export function failOrphanedMissions(): void {
  getDb()
    .prepare(
      `UPDATE missions SET status = 'cancelled', updated_at = ?
       WHERE status IN ('running', 'paused')`
    )
    .run(Date.now())
}
