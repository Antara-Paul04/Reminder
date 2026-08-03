import Database from 'better-sqlite3'
import { app } from 'electron'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { MIGRATIONS } from './schema'

let db: Database.Database | null = null

export function openDatabase(): void {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })

  db = new Database(join(dir, 'ai-studio.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database has not been opened')
  return db
}

export function closeDatabase(): void {
  db?.close()
  db = null
}

function migrate(database: Database.Database): void {
  const current = database.pragma('user_version', { simple: true }) as number
  for (let version = current; version < MIGRATIONS.length; version++) {
    const apply = database.transaction(() => {
      database.exec(MIGRATIONS[version])
      database.pragma(`user_version = ${version + 1}`)
    })
    apply()
  }
}
