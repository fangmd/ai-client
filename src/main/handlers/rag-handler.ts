import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseError, responseSuccess } from '@/common/response'
import { logError, logInfo } from '@/main/utils'
import {
  createRagLibrary,
  listRagLibraries,
  updateRagLibraryName,
  deleteRagLibrary
} from '@/main/repository/rag-library'
import {
  createRagDocument,
  listRagDocuments,
  updateRagDocumentStatus,
  getRagDocumentById,
  deleteRagDocument
} from '@/main/repository/rag-document'
import {
  deleteRagChunksByDocument,
  getRagChunksByIds,
  insertRagChunks,
  listRagChunksByDocument
} from '@/main/repository/rag-chunk'
import { runWorkerTask } from '@/main/utils/worker-manager'
import { insertVectors } from '@/main/utils/vector-store'
import { searchHybrid } from '@/main/utils/hybrid-search'
import { getRagDatabase } from '@/main/utils/rag-db'
import type { RagDocument, RagLibrary } from '@/types'

const DEFAULT_CHUNK_SIZE = 500
const DEFAULT_OVERLAP_RATIO = 0.1
const DEFAULT_TOP_K = 5
const EMBEDDING_BATCH_SIZE = 15

async function indexDocument(document: RagDocument): Promise<void> {
  try {
    updateRagDocumentStatus({ id: document.id, status: 'indexing' })

    const parseResult = (await runWorkerTask({
      type: 'parseDocument',
      payload: { filePath: document.filePath }
    })) as { content: string }

    const chunks = (await runWorkerTask({
      type: 'chunkText',
      payload: {
        content: parseResult.content,
        options: {
          chunkSize: DEFAULT_CHUNK_SIZE,
          overlapRatio: DEFAULT_OVERLAP_RATIO
        }
      }
    })) as Array<{ content: string; index: number; metadata: Record<string, unknown> }>

    if (chunks.length === 0) {
      updateRagDocumentStatus({
        id: document.id,
        status: 'failed',
        errorMessage: 'No content extracted from document'
      })
      return
    }

    const insertedChunks = insertRagChunks(
      document.id,
      chunks.map((chunk) => ({
        content: chunk.content,
        chunkIndex: chunk.index,
        metadata: chunk.metadata
      }))
    )

    for (let i = 0; i < insertedChunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = insertedChunks.slice(i, i + EMBEDDING_BATCH_SIZE)
      const embeddings = (await runWorkerTask({
        type: 'embedTexts',
        payload: {
          texts: batch.map((item) => item.content)
        }
      })) as Float32Array[]

      insertVectors(
        batch.map((chunk, index) => ({
          chunkId: chunk.id,
          embedding: embeddings[index]
        }))
      )
    }

    updateRagDocumentStatus({ id: document.id, status: 'ready' })
    logInfo('RAG document indexed', { documentId: document.id })
  } catch (error) {
    logError('RAG document indexing failed', { documentId: document.id, error })
    updateRagDocumentStatus({
      id: document.id,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Indexing failed'
    })
  }
}

export class RagHandler {
  static register(): void {
    ipcMain.handle(IPC_CHANNELS.rag.createLibrary, async (_event, payload: { name: string }) => {
      try {
        const library = createRagLibrary(payload.name)
        return responseSuccess<RagLibrary>(library)
      } catch (error) {
        logError('rag:createLibrary failed', error)
        return responseError(error)
      }
    })

    ipcMain.handle(IPC_CHANNELS.rag.listLibraries, async () => {
      try {
        const libraries = listRagLibraries()
        return responseSuccess<RagLibrary[]>(libraries)
      } catch (error) {
        logError('rag:listLibraries failed', error)
        return responseError(error)
      }
    })

    ipcMain.handle(
      IPC_CHANNELS.rag.updateLibrary,
      async (_event, payload: { id: bigint; name: string }) => {
        try {
          const library = updateRagLibraryName(payload.id, payload.name)
          return responseSuccess<RagLibrary>(library)
        } catch (error) {
          logError('rag:updateLibrary failed', error)
          return responseError(error)
        }
      }
    )

    ipcMain.handle(IPC_CHANNELS.rag.deleteLibrary, async (_event, payload: { id: bigint }) => {
      try {
        deleteRagLibrary(payload.id)
        return responseSuccess<void>(undefined)
      } catch (error) {
        logError('rag:deleteLibrary failed', error)
        return responseError(error)
      }
    })

    ipcMain.handle(
      IPC_CHANNELS.rag.uploadDocument,
      async (
        _event,
        payload: { libraryId: bigint; filePath: string; fileName?: string; fileSize?: number; mimeType?: string }
      ) => {
        try {
          const fileName = payload.fileName ?? payload.filePath.split(/[\\/]/).pop() ?? 'document'
          const document = createRagDocument({
            libraryId: payload.libraryId,
            fileName,
            filePath: payload.filePath,
            fileSize: payload.fileSize,
            mimeType: payload.mimeType,
            status: 'pending'
          })

          indexDocument(document)
          return responseSuccess<RagDocument>(document)
        } catch (error) {
          logError('rag:uploadDocument failed', error)
          return responseError(error)
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.rag.listDocuments,
      async (_event, payload: { libraryId: bigint }) => {
        try {
          const documents = listRagDocuments(payload.libraryId)
          return responseSuccess<RagDocument[]>(documents)
        } catch (error) {
          logError('rag:listDocuments failed', error)
          return responseError(error)
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.rag.getDocumentStatus,
      async (_event, payload: { documentId: bigint }) => {
        try {
          const document = getRagDocumentById(payload.documentId)
          return responseSuccess<RagDocument | null>(document)
        } catch (error) {
          logError('rag:getDocumentStatus failed', error)
          return responseError(error)
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.rag.deleteDocument,
      async (_event, payload: { documentId: bigint }) => {
        try {
          const chunks = listRagChunksByDocument(payload.documentId)
          if (chunks.length > 0) {
            const db = getRagDatabase()
            const placeholders = chunks.map(() => '?').join(',')
            db.prepare(`DELETE FROM rag_vector WHERE rowid IN (${placeholders})`).run(
              ...chunks.map((chunk) => chunk.id)
            )
          }
          deleteRagDocument(payload.documentId)
          return responseSuccess<void>(undefined)
        } catch (error) {
          logError('rag:deleteDocument failed', error)
          return responseError(error)
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.rag.refreshDocument,
      async (_event, payload: { documentId: bigint }) => {
        try {
          const document = getRagDocumentById(payload.documentId)
          if (!document) {
            return responseSuccess<RagDocument | null>(null)
          }

          const chunks = listRagChunksByDocument(payload.documentId)
          if (chunks.length > 0) {
            const db = getRagDatabase()
            const placeholders = chunks.map(() => '?').join(',')
            db.prepare(`DELETE FROM rag_vector WHERE rowid IN (${placeholders})`).run(
              ...chunks.map((chunk) => chunk.id)
            )
            deleteRagChunksByDocument(payload.documentId)
          }

          const updatedDocument = updateRagDocumentStatus({
            id: payload.documentId,
            status: 'pending',
            errorMessage: null
          })
          indexDocument(updatedDocument)
          return responseSuccess<RagDocument>(updatedDocument)
        } catch (error) {
          logError('rag:refreshDocument failed', error)
          return responseError(error)
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.rag.search,
      async (
        _event,
        payload: { libraryId: bigint; query: string; topK?: number }
      ) => {
        try {
          const topK = payload.topK ?? DEFAULT_TOP_K
          const embeddings = (await runWorkerTask({
            type: 'embedTexts',
            payload: { texts: [payload.query] }
          })) as Float32Array[]

          const results = searchHybrid(
            { text: payload.query, embedding: embeddings[0] },
            { topK }
          )

          const chunkIds = results.map((item) => item.chunkId)
          const chunks = getRagChunksByIds(chunkIds)
          const chunkMap = new Map(chunks.map((chunk) => [chunk.id, chunk]))

          const db = getRagDatabase()
          const placeholders = chunkIds.map(() => '?').join(',')
          const rows =
            chunkIds.length > 0
              ? (db
                  .prepare(
                    `
                    SELECT rag_chunk.id as chunk_id,
                           rag_document.id as document_id,
                           rag_document.library_id as library_id,
                           rag_document.file_name as file_name,
                           rag_document.file_path as file_path
                    FROM rag_chunk
                    JOIN rag_document ON rag_chunk.document_id = rag_document.id
                    WHERE rag_chunk.id IN (${placeholders})
                      AND rag_document.library_id = ?
                  `
                  )
                  .all(...chunkIds, payload.libraryId) as Array<{
                  chunk_id: bigint
                  document_id: bigint
                  library_id: bigint
                  file_name: string
                  file_path: string
                }>)
              : []

          const docMap = new Map<bigint, {
            documentId: bigint
            libraryId: bigint
            fileName: string
            filePath: string
          }>()
          for (const row of rows) {
            docMap.set(row.chunk_id, {
              documentId: row.document_id,
              libraryId: row.library_id,
              fileName: row.file_name,
              filePath: row.file_path
            })
          }

          const merged = results
            .map((result) => {
              const chunk = chunkMap.get(result.chunkId)
              const doc = docMap.get(result.chunkId)
              if (!chunk || !doc) return null
              return {
                ...result,
                content: chunk.content,
                metadata: chunk.metadata,
                document: doc
              }
            })
            .filter(Boolean)

          return responseSuccess(merged)
        } catch (error) {
          logError('rag:search failed', error)
          return responseError(error)
        }
      }
    )
  }

  static unregister(): void {
    ipcMain.removeHandler(IPC_CHANNELS.rag.createLibrary)
    ipcMain.removeHandler(IPC_CHANNELS.rag.listLibraries)
    ipcMain.removeHandler(IPC_CHANNELS.rag.updateLibrary)
    ipcMain.removeHandler(IPC_CHANNELS.rag.deleteLibrary)
    ipcMain.removeHandler(IPC_CHANNELS.rag.uploadDocument)
    ipcMain.removeHandler(IPC_CHANNELS.rag.listDocuments)
    ipcMain.removeHandler(IPC_CHANNELS.rag.deleteDocument)
    ipcMain.removeHandler(IPC_CHANNELS.rag.refreshDocument)
    ipcMain.removeHandler(IPC_CHANNELS.rag.getDocumentStatus)
    ipcMain.removeHandler(IPC_CHANNELS.rag.search)
  }
}
