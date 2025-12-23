import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../common/constants'
import { responseSuccess, responseError } from '../../common/response'
import type { CreateAiProviderData } from '@/types'
import {
  createAiProvider,
  getDefaultAiProvider,
  setDefaultAiProvider
} from '../repository/ai-provider'
import { logError, logInfo } from '../utils'

/**
 * AI Provider Handler
 * 处理 AI Provider 相关的 IPC 请求
 */
export class AIProviderHandler {
  /**
   * 注册所有 AI Provider 相关的 IPC 处理器
   */
  static register(): void {
    // 创建 AI Provider
    ipcMain.handle(IPC_CHANNELS.aiProvider.create, async (_event, data: CreateAiProviderData) => {
      try {
        const provider = await createAiProvider(data)

        // 如果设置为默认，则设置默认状态
        if (data.isDefault) {
          await setDefaultAiProvider(provider.id)
        }

        return responseSuccess(provider)
      } catch (error) {
        return responseError(error)
      }
    })

    // 获取默认 AI Provider
    ipcMain.handle(IPC_CHANNELS.aiProvider.getDefault, async () => {
      try {
        const provider = await getDefaultAiProvider()
        const response = responseSuccess(provider)
        logInfo('【IPC Handler】aiProvider:getDefault success, response:', response)
        return response
      } catch (error) {
        const response = responseError(error)
        logError('【IPC Handler】aiProvider:getDefault error, response:', response)
        return response
      }
    })
  }

  /**
   * 注销所有 AI Provider 相关的 IPC 处理器
   */
  static unregister(): void {
    ipcMain.removeHandler(IPC_CHANNELS.aiProvider.create)
    ipcMain.removeHandler(IPC_CHANNELS.aiProvider.getDefault)
  }
}
