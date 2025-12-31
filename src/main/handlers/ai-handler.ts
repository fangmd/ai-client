import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import { AIProviderFactory } from '@/main/providers'
import { logInfo, logError, logDebug } from '@/main/utils'
import type { ToolCallInfo, StreamChatRequest, CancelChatRequest, AIMessageInput } from '@/types'
import { createMessage, updateMessage } from '@/main/repository/message'
import { getConfig } from '@/main/repository/config'

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

      // 默认启用 terminal 工具
      const finalTools: string[] = tools ? [...tools] : []
      if (!finalTools.includes('terminal')) {
        finalTools.push('terminal')
      }

      logInfo('【IPC Handler】ai:streamChat called, params:', {
        requestId,
        sessionId,
        messagesCount: messages.length,
        provider: config.provider,
        model: config.model,
        tools: finalTools
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

        // 获取系统提示词（系统提示词是纯文本，不需要 JSON 解析）
        const systemPromptConfig = await getConfig('system_prompt')
        const systemPrompt = systemPromptConfig?.value || ''
        
        // 如果系统提示词不为空，添加到消息列表开头
        const finalMessages: AIMessageInput[] = systemPrompt.trim()
          ? [{ role: 'system', content: systemPrompt.trim() }, ...messages]
          : messages

        logDebug('【IPC Handler】System prompt injected', {
          hasSystemPrompt: !!systemPrompt.trim(),
          systemPromptLength: systemPrompt.trim().length,
          finalMessagesCount: finalMessages.length
        })

        // 用于存储工具调用消息的 ID 映射
        const toolCallMessageIds = new Map<string, bigint>()

        // 调用 Provider 进行流式聊天
        await provider.streamChat(
          finalMessages,
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
                
                // 通知前端工具调用开始，直接使用 DbMessage
                event.sender.send(IPC_CHANNELS.ai.toolCallStart, {
                  requestId,
                  toolInfo,
                  messageId: toolMessage.id.toString(),
                  message: toolMessage
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
                    message: updatedMessage
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
            onToolCallComplete: async (toolInfo: ToolCallInfo, resultContent?: string) => {
              const messageId = toolCallMessageIds.get(toolInfo.itemId)
              if (messageId) {
                try {
                  // 对于终端工具，使用 command 字段；对于其他工具，使用 query 字段
                  const toolQuery = toolInfo.type === 'terminal' 
                    ? toolInfo.command 
                    : toolInfo.query
                  
                  // 对于终端工具，如果有执行结果，使用执行结果作为内容；否则使用完成消息
                  const content = toolInfo.type === 'terminal' && resultContent
                    ? resultContent
                    : getToolCallCompleteMessage(toolInfo)
                  
                  const updatedMessage = await updateMessage(messageId, {
                    content,
                    status: 'sent',
                    toolStatus: toolInfo.status,
                    toolQuery
                  })
                  
                  // 通知前端工具调用完成
                  event.sender.send(IPC_CHANNELS.ai.toolCallComplete, {
                    requestId,
                    toolInfo,
                    messageId: messageId.toString(),
                    message: updatedMessage
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
            
            onDone: (completeText?: string) => {
              // 发送完成事件
              logInfo('【IPC Handler】ai:streamDone, requestId:', requestId, 'hasCompleteText:', !!completeText)
              event.sender.send(IPC_CHANNELS.ai.streamDone, {
                requestId,
                completeText: completeText || undefined
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
          { tools: finalTools as any }
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
    case 'terminal':
      return '💻 正在执行终端命令...'
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
  switch (toolInfo.type) {
    case 'web_search':
    case 'file_search': {
      const query = toolInfo.query ? `\n查询：${toolInfo.query}` : ''
      return toolInfo.type === 'web_search' 
        ? `✅ 网络搜索完成${query}`
        : `✅ 文件搜索完成${query}`
    }
    case 'terminal': {
      const command = toolInfo.command ? `\n命令：${toolInfo.command}` : ''
      return `✅ 终端命令执行完成${command}`
    }
    default:
      return '✅ 工具调用完成'
  }
}

