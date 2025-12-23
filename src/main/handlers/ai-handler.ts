import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import { AIProviderFactory } from '@/main/providers'
import { logInfo, logError, logDebug } from '@/main/utils'
import type { Message, AIConfig } from '@/types'

/**
 * 存储活跃的请求，用于取消功能
 */
const activeRequests = new Map<string, AbortController>()

/**
 * AI Handler
 * 处理 AI 相关的 IPC 请求
 */
export class AIHandler {
  /**
   * 注册所有 AI 相关的 IPC 处理器
   */
  static register(): void {
    // 流式聊天请求处理
    ipcMain.on(IPC_CHANNELS.ai.streamChat, async (event, request) => {
      const { messages, config, requestId } = request as {
        messages: Omit<Message, 'id' | 'timestamp'>[]
        config: AIConfig
        requestId: string
      }

      logInfo('【IPC Handler】ai:streamChat called, params:', {
        requestId,
        messagesCount: messages.length,
        provider: config.provider,
        model: config.model
      })

      try {
        // 创建 AbortController 用于取消请求
        const abortController = new AbortController()
        activeRequests.set(requestId, abortController)

        // 创建对应的 Provider
        const provider = AIProviderFactory.create(config.provider)

        // 验证配置
        if (!provider.validateConfig(config)) {
          const errorResponse = responseError('Invalid AI configuration')
          logError('【IPC Handler】ai:streamChat error - Invalid config, requestId:', requestId)
          event.reply(IPC_CHANNELS.ai.streamError, {
            requestId,
            ...errorResponse
          })
          activeRequests.delete(requestId)
          return
        }

        // 调用 Provider 进行流式聊天
        await provider.streamChat(
          messages,
          config,
          {
            onChunk: (chunk: string) => {
              // 发送数据块
              logDebug('【IPC Handler】ai:streamChunk, requestId:', requestId, 'chunkLength:', chunk.length)
              event.sender.send(IPC_CHANNELS.ai.streamChunk, {
                requestId,
                chunk
              })
            },
            onDone: () => {
              // 发送完成事件
              logInfo('【IPC Handler】ai:streamDone, requestId:', requestId)
              event.sender.send(IPC_CHANNELS.ai.streamDone, {
                requestId
              })
              activeRequests.delete(requestId)
            },
            onError: (error: Error) => {
              // 发送错误事件
              logError('【IPC Handler】ai:streamError, requestId:', requestId, 'error:', error.message)
              event.sender.send(IPC_CHANNELS.ai.streamError, {
                requestId,
                ...responseError(error)
              })
              activeRequests.delete(requestId)
            }
          },
          abortController.signal
        )
      } catch (error) {
        logError('【IPC Handler】ai:streamChat exception, requestId:', requestId, 'error:', error)
        event.sender.send(IPC_CHANNELS.ai.streamError, {
          requestId,
          ...responseError(error)
        })
        activeRequests.delete(requestId)
      }
    })

    // 取消聊天请求处理
    ipcMain.on(IPC_CHANNELS.ai.cancelChat, (event, request) => {
      const { requestId } = request as { requestId: string }
      logInfo('【IPC Handler】ai:cancelChat called, params:', { requestId })

      const abortController = activeRequests.get(requestId)
      if (abortController) {
        abortController.abort()
        activeRequests.delete(requestId)
        const response = responseSuccess(undefined, 'Request cancelled')
        logInfo('【IPC Handler】ai:cancelChat success, response:', response)
        event.reply(IPC_CHANNELS.ai.cancelChat, response)
      } else {
        const response = responseError('Request not found')
        logError('【IPC Handler】ai:cancelChat error, response:', response)
        event.reply(IPC_CHANNELS.ai.cancelChat, response)
      }
    })
  }

  /**
   * 注销所有 AI 相关的 IPC 处理器
   */
  static unregister(): void {
    // 取消所有活跃的请求
    activeRequests.forEach((controller) => {
      controller.abort()
    })
    activeRequests.clear()

    // 移除所有监听器
    ipcMain.removeAllListeners(IPC_CHANNELS.ai.streamChat)
    ipcMain.removeAllListeners(IPC_CHANNELS.ai.cancelChat)
  }
}
