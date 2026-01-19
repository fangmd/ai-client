import { searchVectors } from './vector-store'
import { searchFulltext } from './fulltext-search'

export interface HybridSearchOptions {
  topK: number
  vectorWeight?: number
  fulltextWeight?: number
}

export interface HybridSearchResult {
  chunkId: bigint
  score: number
  vectorDistance?: number
  fulltextScore?: number
}

export function searchHybrid(
  query: {
    text: string
    embedding: Float32Array
  },
  options: HybridSearchOptions
): HybridSearchResult[] {
  const vectorWeight = options.vectorWeight ?? 0.7
  const fulltextWeight = options.fulltextWeight ?? 0.3
  const topK = options.topK

  const vectorResults = searchVectors(query.embedding, topK)
  const fulltextResults = searchFulltext(query.text, topK)

  const scores = new Map<bigint, HybridSearchResult>()

  for (const result of vectorResults) {
    const vectorScore = 1 / (1 + result.distance)
    scores.set(result.chunkId, {
      chunkId: result.chunkId,
      score: vectorScore * vectorWeight,
      vectorDistance: result.distance
    })
  }

  for (const result of fulltextResults) {
    const fulltextScore = 1 / (1 + result.score)
    const existing = scores.get(result.chunkId)
    if (existing) {
      existing.fulltextScore = result.score
      existing.score += fulltextScore * fulltextWeight
    } else {
      scores.set(result.chunkId, {
        chunkId: result.chunkId,
        score: fulltextScore * fulltextWeight,
        fulltextScore: result.score
      })
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
