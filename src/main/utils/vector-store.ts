import { getRagDatabase } from './rag-db'

export interface VectorSearchResult {
  chunkId: bigint
  distance: number
}

export function insertVectors(
  items: Array<{ chunkId: bigint; embedding: Float32Array }>
): void {
  if (items.length === 0) return
  const db = getRagDatabase()
  const stmt = db.prepare('INSERT OR REPLACE INTO rag_vector(rowid, embedding) VALUES (?, ?)')
  const insertMany = db.transaction((records: typeof items) => {
    for (const record of records) {
      stmt.run(record.chunkId, record.embedding)
    }
  })
  insertMany(items)
}

export function searchVectors(
  queryEmbedding: Float32Array,
  topK: number
): VectorSearchResult[] {
  const db = getRagDatabase()
  const rows = db
    .prepare(
      `
      SELECT rowid as chunkId, distance
      FROM rag_vector
      WHERE embedding MATCH ?
      ORDER BY distance
      LIMIT ?
    `
    )
    .all(queryEmbedding, topK) as Array<{ chunkId: bigint | number; distance: number }>

  return rows.map((row) => ({
    chunkId: typeof row.chunkId === 'bigint' ? row.chunkId : BigInt(row.chunkId),
    distance: row.distance
  }))
}
