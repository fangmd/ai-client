import { create } from 'zustand'
import type { AiProvider, CreateAiProviderData, UpdateAiProviderData, IPCResponse } from '@/types'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'

interface AiProviderState {
  // 数据
  providers: AiProvider[]
  loading: boolean

  // Actions
  loadProviders: () => Promise<void>
  createProvider: (data: CreateAiProviderData) => Promise<AiProvider | null>
  updateProvider: (id: bigint, data: UpdateAiProviderData) => Promise<AiProvider | null>
  deleteProvider: (id: bigint) => Promise<boolean>
  setDefault: (id: bigint) => Promise<boolean>

  // Getters
  getDefaultProvider: () => AiProvider | undefined
}

export const useAiProviderStore = create<AiProviderState>((set, get) => ({
  providers: [],
  loading: false,

  /**
   * 加载所有 AI Providers
   */
  loadProviders: async () => {
    set({ loading: true })
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.list
      )) as IPCResponse<AiProvider[]>

      if (response.code === SUCCESS_CODE && response.data) {
        set({ providers: response.data })
      }
    } catch (error) {
      console.error('Failed to load providers:', error)
    } finally {
      set({ loading: false })
    }
  },

  /**
   * 创建新的 AI Provider
   */
  createProvider: async (data: CreateAiProviderData) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.create,
        data
      )) as IPCResponse<AiProvider>

      if (response.code === SUCCESS_CODE && response.data) {
        // 重新加载列表以确保数据一致性（isDefault 可能会变化）
        await get().loadProviders()
        return response.data
      }
      return null
    } catch (error) {
      console.error('Failed to create provider:', error)
      return null
    }
  },

  /**
   * 更新 AI Provider
   */
  updateProvider: async (id: bigint, data: UpdateAiProviderData) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.update,
        { id, data }
      )) as IPCResponse<AiProvider>

      if (response.code === SUCCESS_CODE && response.data) {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? response.data! : p
          )
        }))
        return response.data
      }
      return null
    } catch (error) {
      console.error('Failed to update provider:', error)
      return null
    }
  },

  /**
   * 删除 AI Provider
   */
  deleteProvider: async (id: bigint) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.delete,
        id
      )) as IPCResponse<null>

      if (response.code === SUCCESS_CODE) {
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id)
        }))
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to delete provider:', error)
      return false
    }
  },

  /**
   * 设置默认 AI Provider
   */
  setDefault: async (id: bigint) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.setDefault,
        id
      )) as IPCResponse<AiProvider>

      if (response.code === SUCCESS_CODE) {
        // 更新本地状态：将所有 provider 的 isDefault 设为 false，目标设为 true
        set((state) => ({
          providers: state.providers.map((p) => ({
            ...p,
            isDefault: p.id === id
          }))
        }))
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to set default provider:', error)
      return false
    }
  },

  /**
   * 获取默认 Provider
   */
  getDefaultProvider: () => {
    return get().providers.find((p) => p.isDefault)
  }
}))

