import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import {
  getMcpConfigs,
  addMcpConfig,
  updateMcpConfig,
  deleteMcpConfig
} from '@/main/repository/config'
import { logError, logInfo } from '@/main/utils'
import type {
  CreateMcpConfigRequest,
  UpdateMcpConfigRequest,
  DeleteMcpConfigRequest
} from '@/types'
import { initializeMcpClient } from '@/main/providers/openai-provider'

/**
 * MCP Config Handler
 * 处理 MCP 配置相关的 IPC 请求
 */
export class McpConfigHandler {
  /**
   * 注册所有 MCP 配置相关的 IPC 处理器
   */
  static register(): void {
    // 获取所有 MCP 配置
    ipcMain.handle(IPC_CHANNELS.mcpConfig.list, async () => {
      logInfo('【IPC Handler】mcp-config:list called')
      try {
        const configs = await getMcpConfigs()
        const response = responseSuccess(configs)
        logInfo('【IPC Handler】mcp-config:list success, count:', configs.length)
        return response
      } catch (error) {
        const response = responseError(error)
        logError('【IPC Handler】mcp-config:list error, response:', response)
        return response
      }
    })

    // 创建 MCP 配置
    ipcMain.handle(
      IPC_CHANNELS.mcpConfig.create,
      async (_event, data: CreateMcpConfigRequest) => {
        logInfo('【IPC Handler】mcp-config:create called, params:', data)
        try {
          // 验证 URL 格式
          try {
            new URL(data.server_url)
          } catch {
            throw new Error('无效的 URL 格式')
          }

          // 验证必填字段
          if (!data.server_label || !data.server_url) {
            throw new Error('服务器标签和 URL 为必填字段')
          }

          const config = await addMcpConfig(data)

          // 如果配置已启用，重新初始化 MCP 客户端
          if (config.enabled !== false) {
            await initializeMcpClient()
          }

          const response = responseSuccess(config)
          logInfo('【IPC Handler】mcp-config:create success, response:', response)
          return response
        } catch (error) {
          const response = responseError(error)
          logError('【IPC Handler】mcp-config:create error, response:', response)
          return response
        }
      }
    )

    // 更新 MCP 配置
    ipcMain.handle(
      IPC_CHANNELS.mcpConfig.update,
      async (_event, request: UpdateMcpConfigRequest) => {
        const { server_label, data } = request
        logInfo('【IPC Handler】mcp-config:update called, server_label:', server_label, 'data:', data)
        try {
          // 如果更新了 URL，验证格式
          if (data.server_url) {
            try {
              new URL(data.server_url)
            } catch {
              throw new Error('无效的 URL 格式')
            }
          }

          const config = await updateMcpConfig(server_label, data)

          // 重新初始化 MCP 客户端以应用更改
          await initializeMcpClient()

          const response = responseSuccess(config)
          logInfo('【IPC Handler】mcp-config:update success, response:', response)
          return response
        } catch (error) {
          const response = responseError(error)
          logError('【IPC Handler】mcp-config:update error, response:', response)
          return response
        }
      }
    )

    // 删除 MCP 配置
    ipcMain.handle(
      IPC_CHANNELS.mcpConfig.delete,
      async (_event, request: DeleteMcpConfigRequest) => {
        const { server_label } = request
        logInfo('【IPC Handler】mcp-config:delete called, server_label:', server_label)
        try {
          await deleteMcpConfig(server_label)

          // 重新初始化 MCP 客户端以断开连接
          await initializeMcpClient()

          const response = responseSuccess(null)
          logInfo('【IPC Handler】mcp-config:delete success')
          return response
        } catch (error) {
          const response = responseError(error)
          logError('【IPC Handler】mcp-config:delete error, response:', response)
          return response
        }
      }
    )
  }

  /**
   * 注销所有 MCP 配置相关的 IPC 处理器
   */
  static unregister(): void {
    ipcMain.removeHandler(IPC_CHANNELS.mcpConfig.list)
    ipcMain.removeHandler(IPC_CHANNELS.mcpConfig.create)
    ipcMain.removeHandler(IPC_CHANNELS.mcpConfig.update)
    ipcMain.removeHandler(IPC_CHANNELS.mcpConfig.delete)
  }
}

