import type { MissionArtifactRecord } from '@shared/types'
import type { ArtifactKind } from '@shared/types'
import { getDb } from './index'

interface ArtifactRow {
  id: string
  mission_id: string
  name: string
  kind: string
  description: string
  content: string
  created_by: string
  created_at: number
}

function toRecord(row: ArtifactRow): MissionArtifactRecord {
  return {
    id: row.id,
    missionId: row.mission_id,
    name: row.name,
    kind: row.kind as ArtifactKind,
    description: row.description,
    content: row.content,
    createdBy: row.created_by,
    createdAt: row.created_at
  }
}

export function listArtifacts(missionId: string): MissionArtifactRecord[] {
  const rows = getDb()
    .prepare('SELECT * FROM mission_artifacts WHERE mission_id = ? ORDER BY created_at')
    .all(missionId) as ArtifactRow[]
  return rows.map(toRecord)
}

export function insertArtifact(record: MissionArtifactRecord): void {
  getDb()
    .prepare(
      `INSERT INTO mission_artifacts (id, mission_id, name, kind, description, content, created_by, created_at)
       VALUES (@id, @missionId, @name, @kind, @description, @content, @createdBy, @createdAt)`
    )
    .run(record)
}
