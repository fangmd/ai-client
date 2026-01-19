import { getRagDatabase } from '@/main/utils/rag-db'
import { generateUUID } from '@/main/utils/snowflake'
import type { RagLibrary } from '@/types'

function mapLibrary(row: any): RagLibrary {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createRagLibrary(name: string): RagLibrary {
  const db = getRagDatabase()
  const id = generateUUID().valueOf() as bigint
  const stmt = db.prepare(
    `INSERT INTO rag_library (id, name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
  stmt.run(id, name)
  const row = db.prepare('SELECT * FROM rag_library WHERE id = ?').get(id)
  return mapLibrary(row)
}

export function listRagLibraries(): RagLibrary[] {
  const db = getRagDatabase()
  const rows = db.prepare('SELECT * FROM rag_library ORDER BY updated_at DESC').all()
  return rows.map(mapLibrary)
}

export function updateRagLibraryName(id: bigint, name: string): RagLibrary {
  const db = getRagDatabase()
  db.prepare('UPDATE rag_library SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    name,
    id
  )
  const row = db.prepare('SELECT * FROM rag_library WHERE id = ?').get(id)
  return mapLibrary(row)
}

export function deleteRagLibrary(id: bigint): void {
  const db = getRagDatabase()
  db.prepare('DELETE FROM rag_library WHERE id = ?').run(id)
}
