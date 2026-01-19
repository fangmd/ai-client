import { getRagDatabase } from '@/main/utils/rag-db'
import { generateUUID } from '@/main/utils/snowflake'
import type { RagDocument, RagDocumentStatus } from '@/types'

function mapDocument(row: any): RagDocument {
  return {
    id: row.id,
    libraryId: row.library_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createRagDocument(input: {
  libraryId: bigint
  fileName: string
  filePath: string
  fileSize?: number
  mimeType?: string
  status?: RagDocumentStatus
}): RagDocument {
  const db = getRagDatabase()
  const id = generateUUID().valueOf() as bigint
  const stmt = db.prepare(`
    INSERT INTO rag_document (
      id, library_id, file_name, file_path, file_size, mime_type, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `)
  stmt.run(
    id,
    input.libraryId,
    input.fileName,
    input.filePath,
    input.fileSize ?? null,
    input.mimeType ?? null,
    input.status ?? 'pending'
  )
  const row = db.prepare('SELECT * FROM rag_document WHERE id = ?').get(id)
  return mapDocument(row)
}

export function updateRagDocumentStatus(input: {
  id: bigint
  status: RagDocumentStatus
  errorMessage?: string | null
}): RagDocument {
  const db = getRagDatabase()
  db.prepare(
    `UPDATE rag_document SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(input.status, input.errorMessage ?? null, input.id)
  const row = db.prepare('SELECT * FROM rag_document WHERE id = ?').get(input.id)
  return mapDocument(row)
}

export function listRagDocuments(libraryId: bigint): RagDocument[] {
  const db = getRagDatabase()
  const rows = db
    .prepare('SELECT * FROM rag_document WHERE library_id = ? ORDER BY updated_at DESC')
    .all(libraryId)
  return rows.map(mapDocument)
}

export function getRagDocumentById(id: bigint): RagDocument | null {
  const db = getRagDatabase()
  const row = db.prepare('SELECT * FROM rag_document WHERE id = ?').get(id)
  if (!row) return null
  return mapDocument(row)
}

export function deleteRagDocument(id: bigint): void {
  const db = getRagDatabase()
  db.prepare('DELETE FROM rag_document WHERE id = ?').run(id)
}
