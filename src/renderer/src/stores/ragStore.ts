import { create } from 'zustand'
import type { IPCResponse, RagLibrary, RagDocument } from '@/types'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'

interface RagConfig {
  enabled: boolean
  topK: number
  threshold: number
}

interface RagState {
  libraries: RagLibrary[]
  documentsByLibrary: Record<string, RagDocument[]>
  selectedLibraryId: bigint | null
  config: RagConfig
  loadingLibraries: boolean
  loadingDocuments: boolean

  loadLibraries: () => Promise<void>
  createLibrary: (name: string) => Promise<void>
  renameLibrary: (id: bigint, name: string) => Promise<void>
  deleteLibrary: (id: bigint) => Promise<void>
  selectLibrary: (id: bigint | null) => void

  loadDocuments: (libraryId: bigint) => Promise<void>
  uploadDocument: (payload: {
    libraryId: bigint
    filePath: string
    fileName?: string
    fileSize?: number
    mimeType?: string
  }) => Promise<void>
  deleteDocument: (libraryId: bigint, documentId: bigint) => Promise<void>
  refreshDocument: (libraryId: bigint, documentId: bigint) => Promise<void>
  refreshDocumentStatus: (libraryId: bigint, documentId: bigint) => Promise<void>

  updateConfig: (config: Partial<RagConfig>) => void
}

const DEFAULT_CONFIG: RagConfig = {
  enabled: false,
  topK: 5,
  threshold: 0.2
}

export const useRagStore = create<RagState>((set, get) => ({
  libraries: [],
  documentsByLibrary: {},
  selectedLibraryId: null,
  config: DEFAULT_CONFIG,
  loadingLibraries: false,
  loadingDocuments: false,

  loadLibraries: async () => {
    set({ loadingLibraries: true })
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.rag.listLibraries
      )) as IPCResponse<RagLibrary[]>
      if (response.code === SUCCESS_CODE && response.data) {
        set({ libraries: response.data })
      }
    } catch (error) {
      console.error('Failed to load RAG libraries:', error)
    } finally {
      set({ loadingLibraries: false })
    }
  },

  createLibrary: async (name) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.rag.createLibrary,
        { name }
      )) as IPCResponse<RagLibrary>
      if (response.code === SUCCESS_CODE && response.data) {
        set((state) => ({
          libraries: [response.data!, ...state.libraries],
          selectedLibraryId: response.data!.id
        }))
      }
    } catch (error) {
      console.error('Failed to create RAG library:', error)
    }
  },

  renameLibrary: async (id, name) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.rag.updateLibrary,
        { id, name }
      )) as IPCResponse<RagLibrary>
      if (response.code === SUCCESS_CODE && response.data) {
        set((state) => ({
          libraries: state.libraries.map((library) =>
            library.id === id ? response.data! : library
          )
        }))
      }
    } catch (error) {
      console.error('Failed to rename RAG library:', error)
    }
  },

  deleteLibrary: async (id) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.rag.deleteLibrary,
        { id }
      )) as IPCResponse<void>
      if (response.code === SUCCESS_CODE) {
        set((state) => ({
          libraries: state.libraries.filter((library) => library.id !== id),
          selectedLibraryId: state.selectedLibraryId === id ? null : state.selectedLibraryId
        }))
      }
    } catch (error) {
      console.error('Failed to delete RAG library:', error)
    }
  },

  selectLibrary: (id) =>
    set((state) => ({
      selectedLibraryId: id,
      config: {
        ...state.config,
        enabled: id !== null
      }
    })),

  loadDocuments: async (libraryId) => {
    set({ loadingDocuments: true })
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.rag.listDocuments,
        { libraryId }
      )) as IPCResponse<RagDocument[]>
      if (response.code === SUCCESS_CODE && response.data) {
        const libraryKey = libraryId.toString()
        set((state) => ({
          documentsByLibrary: {
            ...state.documentsByLibrary,
            [libraryKey]: response.data || []
          }
        }))
      }
    } catch (error) {
      console.error('Failed to load RAG documents:', error)
    } finally {
      set({ loadingDocuments: false })
    }
  },

  uploadDocument: async (payload) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.rag.uploadDocument,
        payload
      )) as IPCResponse<RagDocument>
      if (response.code === SUCCESS_CODE && response.data) {
        const libraryKey = payload.libraryId.toString()
        set((state) => ({
          documentsByLibrary: {
            ...state.documentsByLibrary,
            [libraryKey]: [
              response.data!,
              ...(state.documentsByLibrary[libraryKey] || [])
            ]
          }
        }))
      }
    } catch (error) {
      console.error('Failed to upload RAG document:', error)
    }
  },

  deleteDocument: async (libraryId, documentId) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.rag.deleteDocument,
        { documentId }
      )) as IPCResponse<void>
      if (response.code === SUCCESS_CODE) {
        const libraryKey = libraryId.toString()
        set((state) => ({
          documentsByLibrary: {
            ...state.documentsByLibrary,
            [libraryKey]: (state.documentsByLibrary[libraryKey] || []).filter(
              (doc) => doc.id !== documentId
            )
          }
        }))
      }
    } catch (error) {
      console.error('Failed to delete RAG document:', error)
    }
  },

  refreshDocument: async (libraryId, documentId) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.rag.refreshDocument,
        { documentId }
      )) as IPCResponse<RagDocument | null>
      if (response.code === SUCCESS_CODE && response.data) {
        const libraryKey = libraryId.toString()
        set((state) => ({
          documentsByLibrary: {
            ...state.documentsByLibrary,
            [libraryKey]: (state.documentsByLibrary[libraryKey] || []).map((doc) =>
              doc.id === documentId ? response.data! : doc
            )
          }
        }))
      }
    } catch (error) {
      console.error('Failed to refresh RAG document:', error)
    }
  },

  refreshDocumentStatus: async (libraryId, documentId) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.rag.getDocumentStatus,
        { documentId }
      )) as IPCResponse<RagDocument | null>
      if (response.code === SUCCESS_CODE && response.data) {
        const libraryKey = libraryId.toString()
        set((state) => ({
          documentsByLibrary: {
            ...state.documentsByLibrary,
            [libraryKey]: (state.documentsByLibrary[libraryKey] || []).map((doc) =>
              doc.id === documentId ? response.data! : doc
            )
          }
        }))
      }
    } catch (error) {
      console.error('Failed to refresh document status:', error)
    }
  },

  updateConfig: (config) =>
    set((state) => ({
      config: {
        ...state.config,
        ...config
      }
    }))
}))
