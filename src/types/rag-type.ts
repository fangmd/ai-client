export interface RagLibrary {
  id: bigint
  name: string
  createdAt: string
  updatedAt: string
}

export type RagDocumentStatus = 'pending' | 'indexing' | 'ready' | 'failed'

export interface RagDocument {
  id: bigint
  libraryId: bigint
  fileName: string
  filePath: string
  fileSize?: number | null
  mimeType?: string | null
  status: RagDocumentStatus
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

export interface RagChunk {
  id: bigint
  documentId: bigint
  content: string
  chunkIndex: number
  metadata?: Record<string, unknown> | null
  createdAt: string
}
