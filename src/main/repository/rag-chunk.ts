import { getRagDatabase } from '@/main/utils/rag-db'
import { generateUUID } from '@/main/utils/snowflake'
import type { RagChunk } from '@/types'

function mapChunk(row: any): RagChunk {
  return {
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    chunkIndex: row.chunk_index,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.created_at
  }
}

export function insertRagChunks(
  documentId: bigint,
  chunks: Array<{ content: string; chunkIndex: number; metadata?: Record<string, unknown> }>
): RagChunk[] {
  if (chunks.length === 0) return []
  const db = getRagDatabase()
  const stmt = db.prepare(
    `INSERT INTO rag_chunk (id, document_id, content, chunk_index, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  )
  const inserted: RagChunk[] = []
  const insertMany = db.transaction(() => {
    for (const chunk of chunks) {
      const id = generateUUID().valueOf() as bigint
      stmt.run(
        id,
        documentId,
        chunk.content,
        chunk.chunkIndex,
        chunk.metadata ? JSON.stringify(chunk.metadata) : null
      )
      inserted.push({
        id,
        documentId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        metadata: chunk.metadata ?? null,
        createdAt: new Date().toISOString()
      })
    }
  })
  insertMany()
  return inserted
}

export function listRagChunksByDocument(documentId: bigint): RagChunk[] {
  const db = getRagDatabase()
  const rows = db
    .prepare('SELECT * FROM rag_chunk WHERE document_id = ? ORDER BY chunk_index ASC')
    .all(documentId)
  return rows.map(mapChunk)
}

export function getRagChunkById(id: bigint): RagChunk | null {
  const db = getRagDatabase()
  const row = db.prepare('SELECT * FROM rag_chunk WHERE id = ?').get(id)
  if (!row) return null
  return mapChunk(row)
}

export function deleteRagChunksByDocument(documentId: bigint): void {
  const db = getRagDatabase()
  db.prepare('DELETE FROM rag_chunk WHERE document_id = ?').run(documentId)
}

export function getRagChunksByIds(ids: bigint[]): RagChunk[] {
  if (ids.length === 0) return []
  const db = getRagDatabase()
  const placeholders = ids.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT * FROM rag_chunk WHERE id IN (${placeholders})`)
    .all(...ids)
  return rows.map(mapChunk)
}
