import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import { AIProviderFactory } from '@/main/providers'
import { logInfo, logError, logDebug } from '@/main/utils'
import type { Message, ToolCallInfo, StreamChatRequest, CancelChatRequest } from '@/types'
import { createMessage, updateMessage } from '@/main/repository/message'

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
    ipcMain.on(IPC_CHANNELS.ai.streamChat, async (event, request: StreamChatRequest) => {
      const { messages, config, requestId, tools, sessionId } = request

      logInfo('【IPC Handler】ai:streamChat called, params:', {
        requestId,
        sessionId,
        messagesCount: messages.length,
        provider: config.provider,
        model: config.model,
        tools: tools || []
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

        // 用于存储工具调用消息的 ID 映射
        const toolCallMessageIds = new Map<string, bigint>()

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
            
            // 工具调用开始 - 创建工具消息
            onToolCallStart: async (toolInfo: ToolCallInfo) => {
              try {
                const toolMessage = await createMessage({
                  sessionId,
                  role: 'tool',
                  content: getToolCallStartMessage(toolInfo),
                  status: 'pending',
                  contentType: 'tool_call',
                  toolType: toolInfo.type,
                  toolStatus: toolInfo.status,
                  toolItemId: toolInfo.itemId,
                  toolOutputIndex: toolInfo.outputIndex
                })
                
                toolCallMessageIds.set(toolInfo.itemId, toolMessage.id)
                
                // 通知前端工具调用开始
                event.sender.send(IPC_CHANNELS.ai.toolCallStart, {
                  requestId,
                  toolInfo,
                  messageId: toolMessage.id.toString(),
                  message: mapDbMessageToMessage(toolMessage)
                })
                
                logInfo('【IPC Handler】Tool call started and message created', {
                  toolInfo,
                  messageId: toolMessage.id.toString()
                })
              } catch (error) {
                logError('【IPC Handler】Failed to create tool call message', error)
              }
            },

            // 工具调用进度更新
            onToolCallProgress: async (toolInfo: ToolCallInfo) => {
              const messageId = toolCallMessageIds.get(toolInfo.itemId)
              if (messageId) {
                try {
                  const updatedMessage = await updateMessage(messageId, {
                    content: getToolCallProgressMessage(toolInfo),
                    toolStatus: toolInfo.status
                  })
                  
                  // 通知前端进度更新
                  event.sender.send(IPC_CHANNELS.ai.toolCallProgress, {
                    requestId,
                    toolInfo,
                    messageId: messageId.toString(),
                    message: mapDbMessageToMessage(updatedMessage)
                  })
                  
                  logDebug('【IPC Handler】Tool call progress updated', {
                    toolInfo,
                    messageId: messageId.toString()
                  })
                } catch (error) {
                  logError('【IPC Handler】Failed to update tool call message', error)
                }
              }
            },

            // 工具调用完成
            onToolCallComplete: async (toolInfo: ToolCallInfo) => {
              const messageId = toolCallMessageIds.get(toolInfo.itemId)
              if (messageId) {
                try {
                  const updatedMessage = await updateMessage(messageId, {
                    content: getToolCallCompleteMessage(toolInfo),
                    status: 'sent',
                    toolStatus: toolInfo.status,
                    toolQuery: toolInfo.query
                  })
                  
                  // 通知前端工具调用完成
                  event.sender.send(IPC_CHANNELS.ai.toolCallComplete, {
                    requestId,
                    toolInfo,
                    messageId: messageId.toString(),
                    message: mapDbMessageToMessage(updatedMessage)
                  })
                  
                  logInfo('【IPC Handler】Tool call completed and message updated', {
                    toolInfo,
                    messageId: messageId.toString()
                  })
                } catch (error) {
                  logError('【IPC Handler】Failed to update tool call message', error)
                }
              }
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
          abortController.signal,
          tools ? { tools } : undefined
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
    ipcMain.on(IPC_CHANNELS.ai.cancelChat, (event, request: CancelChatRequest) => {
      const { requestId } = request
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

/**
 * 辅助函数：生成工具调用的消息内容
 */
function getToolCallStartMessage(toolInfo: ToolCallInfo): string {
  switch (toolInfo.type) {
    case 'web_search':
      return '🔍 正在搜索网络...'
    case 'file_search':
      return '📁 正在搜索文件...'
    default:
      return '⚙️ 正在执行工具调用...'
  }
}

function getToolCallProgressMessage(toolInfo: ToolCallInfo): string {
  switch (toolInfo.status) {
    case 'in_progress':
      return '🔍 搜索准备中...'
    case 'searching':
      return '🔍 正在搜索...'
    default:
      return getToolCallStartMessage(toolInfo)
  }
}

function getToolCallCompleteMessage(toolInfo: ToolCallInfo): string {
  const query = toolInfo.query ? `\n查询：${toolInfo.query}` : ''
  switch (toolInfo.type) {
    case 'web_search':
      return `✅ 网络搜索完成${query}`
    case 'file_search':
      return `✅ 文件搜索完成${query}`
    default:
      return `✅ 工具调用完成${query}`
  }
}

/**
 * 映射数据库消息到前端消息类型
 */
function mapDbMessageToMessage(dbMessage: any): Message {
  return {
    id: dbMessage.id,
    role: dbMessage.role,
    content: dbMessage.content,
    timestamp: dbMessage.createdAt.getTime(),
    status: dbMessage.status === 'sent' ? 'done' : dbMessage.status === 'pending' ? 'sending' : 'error',
    contentType: dbMessage.contentType,
    toolCall: dbMessage.contentType === 'tool_call' ? {
      itemId: dbMessage.toolItemId,
      type: dbMessage.toolType,
      status: dbMessage.toolStatus,
      query: dbMessage.toolQuery,
      outputIndex: dbMessage.toolOutputIndex
    } : undefined
  }
}
