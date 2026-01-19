/**
 * 统一响应格式
 */
export interface IPCResponse<T = unknown> {
  code: number
  data?: T
  msg: string
}

// ==================== RAG IPC 类型 ====================
export interface RagCreateLibraryRequest {
  name: string
}

export interface RagUpdateLibraryRequest {
  id: bigint
  name: string
}

export interface RagDeleteLibraryRequest {
  id: bigint
}

export interface RagUploadDocumentRequest {
  libraryId: bigint
  filePath: string
  fileName?: string
  fileSize?: number
  mimeType?: string
}

export interface RagListDocumentsRequest {
  libraryId: bigint
}

export interface RagDeleteDocumentRequest {
  documentId: bigint
}

export interface RagRefreshDocumentRequest {
  documentId: bigint
}

export interface RagGetDocumentStatusRequest {
  documentId: bigint
}

export interface RagSearchRequest {
  libraryId: bigint
  query: string
  topK?: number
}