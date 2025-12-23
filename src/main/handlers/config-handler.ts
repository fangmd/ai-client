import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import { getConfig, getAllConfigs, setConfig, deleteConfig } from '@/main/repository/config'
import { logError, logInfo } from '@/main/utils'

/**
 * Config Handler
 * 处理配置相关的 IPC 请求
 */
export class ConfigHandler {
  /**
   * 注册所有配置相关的 IPC 处理器
   */
  static register(): void {
    // 获取单个配置
    ipcMain.handle(IPC_CHANNELS.config.get, async (_event, key: string) => {
      logInfo('【IPC Handler】config:get called, key:', key)
      try {
        const config = await getConfig(key)
        const response = responseSuccess(config)
        logInfo('【IPC Handler】config:get success')
        return response
      } catch (error) {
        const response = responseError(error)
        logError('【IPC Handler】config:get error:', response)
        return response
      }
    })

    // 获取所有配置
    ipcMain.handle(IPC_CHANNELS.config.getAll, async () => {
      logInfo('【IPC Handler】config:getAll called')
      try {
        const configs = await getAllConfigs()
        const response = responseSuccess(configs)
        logInfo('【IPC Handler】config:getAll success')
        return response
      } catch (error) {
        const response = responseError(error)
        logError('【IPC Handler】config:getAll error:', response)
        return response
      }
    })

    // 设置配置
    ipcMain.handle(
      IPC_CHANNELS.config.set,
      async (_event, data: { key: string; value: string }) => {
        logInfo('【IPC Handler】config:set called, key:', data.key)
        try {
          const config = await setConfig(data.key, data.value)
          const response = responseSuccess(config)
          logInfo('【IPC Handler】config:set success')
          return response
        } catch (error) {
          const response = responseError(error)
          logError('【IPC Handler】config:set error:', response)
          return response
        }
      }
    )

    // 删除配置
    ipcMain.handle(IPC_CHANNELS.config.delete, async (_event, key: string) => {
      logInfo('【IPC Handler】config:delete called, key:', key)
      try {
        await deleteConfig(key)
        const response = responseSuccess(null)
        logInfo('【IPC Handler】config:delete success')
        return response
      } catch (error) {
        const response = responseError(error)
        logError('【IPC Handler】config:delete error:', response)
        return response
      }
    })
  }

  /**
   * 注销所有配置相关的 IPC 处理器
   */
  static unregister(): void {
    ipcMain.removeHandler(IPC_CHANNELS.config.get)
    ipcMain.removeHandler(IPC_CHANNELS.config.getAll)
    ipcMain.removeHandler(IPC_CHANNELS.config.set)
    ipcMain.removeHandler(IPC_CHANNELS.config.delete)
  }
}

