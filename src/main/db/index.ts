import { join } from 'path'
import { mkdirSync } from 'fs'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type Db = ReturnType<typeof drizzle<typeof schema>>

export let db: Db
export let screenshotsPath: string

export function initDb(): void {
  const userData = app.getPath('userData')

  screenshotsPath = join(userData, 'screenshots')
  mkdirSync(screenshotsPath, { recursive: true })
  mkdirSync(join(userData, 'logs'), { recursive: true })

  const sqlite = new Database(join(userData, 'confluent.db'))
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })

  migrate(db, { migrationsFolder: join(app.getAppPath(), 'drizzle', 'migrations') })
}
