import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../common/constants'
import { responseSuccess, responseError } from '../../common/response'
import { AIProviderFactory } from '../providers'
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

      try {
        // 创建 AbortController 用于取消请求
        const abortController = new AbortController()
        activeRequests.set(requestId, abortController)

        // 创建对应的 Provider
        const provider = AIProviderFactory.create(config.provider)

        // 验证配置
        if (!provider.validateConfig(config)) {
          event.reply(IPC_CHANNELS.ai.streamError, {
            requestId,
            ...responseError('Invalid AI configuration')
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
              event.sender.send(IPC_CHANNELS.ai.streamChunk, {
                requestId,
                chunk
              })
            },
            onDone: () => {
              // 发送完成事件
              event.sender.send(IPC_CHANNELS.ai.streamDone, {
                requestId
              })
              activeRequests.delete(requestId)
            },
            onError: (error: Error) => {
              // 发送错误事件
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

      const abortController = activeRequests.get(requestId)
      if (abortController) {
        abortController.abort()
        activeRequests.delete(requestId)
        event.reply(IPC_CHANNELS.ai.cancelChat, responseSuccess(undefined, 'Request cancelled'))
      } else {
        event.reply(IPC_CHANNELS.ai.cancelChat, responseError('Request not found'))
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
