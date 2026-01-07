import { create } from 'zustand'
import type { IPCResponse, McpServerConfig } from '@/types'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'
import type {
  CreateMcpConfigRequest,
  UpdateMcpConfigRequest,
  DeleteMcpConfigRequest
} from '@/types'

interface McpConfigState {
  // 配置数据
  configs: McpServerConfig[]
  loading: boolean
  error: string | null

  // Actions
  loadConfigs: () => Promise<void>
  createConfig: (data: CreateMcpConfigRequest) => Promise<void>
  updateConfig: (request: UpdateMcpConfigRequest) => Promise<void>
  deleteConfig: (serverLabel: string) => Promise<void>
  clearError: () => void
}

export const useMcpConfigStore = create<McpConfigState>((set, get) => ({
  configs: [],
  loading: false,
  error: null,

  /**
   * 加载所有 MCP 配置
   */
  loadConfigs: async () => {
    set({ loading: true, error: null })
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.mcpConfig.list
      )) as IPCResponse<McpServerConfig[]>

      if (response.code === SUCCESS_CODE && response.data) {
        set({ configs: response.data, loading: false })
      } else {
        set({ error: response.msg || '加载配置失败', loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载配置失败',
        loading: false
      })
    }
  },

  /**
   * 创建 MCP 配置
   */
  createConfig: async (data: CreateMcpConfigRequest) => {
    set({ loading: true, error: null })
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.mcpConfig.create,
        data
      )) as IPCResponse<McpServerConfig>

      if (response.code === SUCCESS_CODE) {
        // 重新加载配置列表
        await get().loadConfigs()
      } else {
        set({ error: response.msg || '创建配置失败', loading: false })
        throw new Error(response.msg || '创建配置失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建配置失败'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * 更新 MCP 配置
   */
  updateConfig: async (request: UpdateMcpConfigRequest) => {
    set({ loading: true, error: null })
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.mcpConfig.update,
        request
      )) as IPCResponse<McpServerConfig>

      if (response.code === SUCCESS_CODE) {
        // 重新加载配置列表
        await get().loadConfigs()
      } else {
        set({ error: response.msg || '更新配置失败', loading: false })
        throw new Error(response.msg || '更新配置失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新配置失败'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * 删除 MCP 配置
   */
  deleteConfig: async (serverLabel: string) => {
    set({ loading: true, error: null })
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.mcpConfig.delete,
        { server_label: serverLabel }
      )) as IPCResponse<void>

      if (response.code === SUCCESS_CODE) {
        // 重新加载配置列表
        await get().loadConfigs()
      } else {
        set({ error: response.msg || '删除配置失败', loading: false })
        throw new Error(response.msg || '删除配置失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除配置失败'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null })
  }
}))

