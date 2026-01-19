export interface TextChunkMetadata {
  startOffset: number
  endOffset: number
  startLine: number
  endLine: number
}

export interface TextChunk {
  index: number
  content: string
  metadata: TextChunkMetadata
}

export interface TextChunkOptions {
  chunkSize?: number
  overlapRatio?: number
}

function buildLineIndex(text: string): number[] {
  const lineStarts = [0]
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') {
      lineStarts.push(i + 1)
    }
  }
  return lineStarts
}

function findLineNumber(lineStarts: number[], offset: number): number {
  let low = 0
  let high = lineStarts.length - 1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const start = lineStarts[mid]
    const nextStart = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : Number.MAX_SAFE_INTEGER
    if (offset >= start && offset < nextStart) {
      return mid + 1
    }
    if (offset < start) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }
  return lineStarts.length
}

export function chunkText(content: string, options?: TextChunkOptions): TextChunk[] {
  const chunkSize = options?.chunkSize ?? 500
  const overlapRatio = options?.overlapRatio ?? 0.1
  const overlapSize = Math.max(0, Math.min(chunkSize - 1, Math.floor(chunkSize * overlapRatio)))

  if (!content) {
    return []
  }

  const lineStarts = buildLineIndex(content)
  const chunks: TextChunk[] = []
  let offset = 0
  let index = 0

  while (offset < content.length) {
    const endOffset = Math.min(offset + chunkSize, content.length)
    const slice = content.slice(offset, endOffset)
    const trimmed = slice.trim()

    if (trimmed) {
      const startLine = findLineNumber(lineStarts, offset)
      const endLine = findLineNumber(lineStarts, Math.max(offset, endOffset - 1))
      chunks.push({
        index,
        content: slice,
        metadata: {
          startOffset: offset,
          endOffset,
          startLine,
          endLine
        }
      })
    }

    if (endOffset >= content.length) {
      break
    }

    offset = Math.max(0, endOffset - overlapSize)
    index += 1
  }

  return chunks
}
