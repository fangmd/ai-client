import { getRagDatabase } from './rag-db'

export interface FulltextSearchResult {
  chunkId: bigint
  score: number
}

export function searchFulltext(query: string, topK: number): FulltextSearchResult[] {
  const db = getRagDatabase()
  const rows = db
    .prepare(
      `
      SELECT rowid as chunkId, bm25(rag_chunk_fts) as score
      FROM rag_chunk_fts
      WHERE rag_chunk_fts MATCH ?
      ORDER BY score
      LIMIT ?
    `
    )
    .all(query, topK) as Array<{ chunkId: bigint | number; score: number }>

  return rows.map((row) => ({
    chunkId: typeof row.chunkId === 'bigint' ? row.chunkId : BigInt(row.chunkId),
    score: row.score
  }))
}
