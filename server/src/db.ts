import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { SCHEMA } from './schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../data')
const DB_PATH = resolve(DATA_DIR, 'workbench.db')

mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(SCHEMA)

export function isEmpty(): boolean {
  const row = db.prepare('SELECT COUNT(*) AS n FROM customer').get() as {
    n: number
  }
  return row.n === 0
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** uuid v4 without pulling a dependency. */
export function uuid(): string {
  return globalThis.crypto.randomUUID()
}
