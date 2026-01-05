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
        // 用于存储工具调用信息映射（itemId -> toolInfo）
        const toolCallInfos = new Map<string, ToolCallInfo>()
        // 用于存储 AI 消息的 ID（itemId -> messageId）
        let assistantMessageId: bigint | null = null

        // IPC 批处理优化：累积 chunk 后批量发送，减少 IPC 通信频率
        // 优化：增大批处理大小和间隔，减少通信频率，提升流畅度
        const chunkBuffer: string[] = []
        let chunkFlushTimer: NodeJS.Timeout | null = null
        const CHUNK_BATCH_SIZE = 25 // 每批最多累积 25 个 chunk（从 10 调整为 25）
        const CHUNK_FLUSH_INTERVAL = 80 // 最多等待 80ms（约 12.5fps）后发送（从 16ms 调整为 80ms）

        const flushChunks = () => {
          if (chunkBuffer.length === 0) return

          // 合并所有 chunk 为单个字符串，减少 IPC 消息数量
          const combinedChunk = chunkBuffer.join('')
          chunkBuffer.length = 0 // 清空缓冲区

          if (chunkFlushTimer) {
            clearTimeout(chunkFlushTimer)
            chunkFlushTimer = null
          }

          event.sender.send(IPC_CHANNELS.ai.streamChunk, {
            requestId,
            chunk: combinedChunk
          })
        }

        // 调用 Provider 进行流式聊天
        await provider.streamChat(
          finalMessages,
          config,
          {
            // AI 消息开始 - 创建 AI 消息
            onAssistantMessageStart: async (item: { id: string; type: string; role?: string }) => {
              try {
                const assistantMessage = await createMessage({
                  sessionId,
                  role: 'assistant',
                  content: '',
                  status: 'pending'
                })

                assistantMessageId = assistantMessage.id

                // 通知前端 AI 消息开始
                event.sender.send(IPC_CHANNELS.ai.assistantMessageStart, {
                  requestId,
                  messageId: assistantMessage.id,
                  message: assistantMessage
                })

                logInfo('【IPC Handler】AI assistant message started and message created', {
                  itemId: item.id,
                  messageId: assistantMessage.id
                })
              } catch (error) {
                logError('【IPC Handler】Failed to create assistant message', error)
              }
            },

            onChunk: (chunk: string) => {
              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug(
              //   '【IPC Handler】ai:streamChunk, requestId:',
              //   requestId,
              //   'chunkLength:',
              //   chunk.length
              // )
              
              // 将 chunk 添加到缓冲区
              chunkBuffer.push(chunk)

              // 如果缓冲区达到批处理大小，立即发送
              if (chunkBuffer.length >= CHUNK_BATCH_SIZE) {
                flushChunks()
              } else {
                // 否则设置定时器，在指定时间后发送（防抖）
                if (chunkFlushTimer) {
                  clearTimeout(chunkFlushTimer)
                }
                chunkFlushTimer = setTimeout(flushChunks, CHUNK_FLUSH_INTERVAL)
              }
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
                toolCallInfos.set(toolInfo.itemId, toolInfo)

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
                  const toolQuery = toolInfo.type === 'terminal' ? toolInfo.command : toolInfo.query

                  // 对于终端工具，如果有执行结果，使用执行结果作为内容；否则使用完成消息
                  const content =
                    toolInfo.type === 'terminal' && resultContent
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

            onDone: async (completeText?: string) => {
              // 确保发送所有剩余的 chunk
              flushChunks()
              if (chunkFlushTimer) {
                clearTimeout(chunkFlushTimer)
                chunkFlushTimer = null
              }

              // 如果有 AI 消息，更新其状态
              if (assistantMessageId) {
                try {
                  await updateMessage(assistantMessageId, {
                    status: 'sent'
                  })
                  logDebug('【IPC Handler】AI assistant message status updated to sent', {
                    messageId: assistantMessageId.toString()
                  })
                } catch (error) {
                  logError('【IPC Handler】Failed to update assistant message status', error)
                }
              }

              // 发送完成事件
              logInfo(
                '【IPC Handler】ai:streamDone, requestId:',
                requestId,
                'hasCompleteText:',
                !!completeText
              )
              event.sender.send(IPC_CHANNELS.ai.streamDone, {
                requestId,
                completeText: completeText || undefined
              })
              activeRequests.delete(requestId)
            },
            onError: async (error: Error, toolInfo?: ToolCallInfo) => {
              // 确保发送所有剩余的 chunk
              flushChunks()
              if (chunkFlushTimer) {
                clearTimeout(chunkFlushTimer)
                chunkFlushTimer = null
              }

              // 如果提供了 toolInfo，只更新那个工具的消息状态
              // 否则，更新所有正在执行的工具消息状态为错误（整个请求出错的情况）
              if (toolInfo) {
                // 单个工具调用出错
                const messageId = toolCallMessageIds.get(toolInfo.itemId)
                if (messageId) {
                  try {
                    // 构造错误状态的 toolInfo
                    const errorToolInfo: ToolCallInfo = {
                      ...toolInfo,
                      status: 'failed'
                    }

                    const updatedMessage = await updateMessage(messageId, {
                      content: getToolCallErrorMessage(errorToolInfo, error.message),
                      status: 'error',
                      toolStatus: 'failed'
                    })

                    // 通知前端工具调用错误（使用 toolCallProgress 通道）
                    event.sender.send(IPC_CHANNELS.ai.toolCallProgress, {
                      requestId,
                      toolInfo: errorToolInfo,
                      messageId: messageId.toString(),
                      message: updatedMessage
                    })

                    logDebug('【IPC Handler】Tool call message status updated to error', {
                      itemId: toolInfo.itemId,
                      messageId: messageId.toString()
                    })
                  } catch (updateError) {
                    logError(
                      '【IPC Handler】Failed to update tool call message status to error',
                      updateError
                    )
                  }
                }
              }

              // 如果有 AI 消息，更新其状态为错误
              if (assistantMessageId) {
                try {
                  await updateMessage(assistantMessageId, {
                    status: 'error'
                  })
                  logDebug('【IPC Handler】AI assistant message status updated to error', {
                    messageId: assistantMessageId.toString()
                  })
                } catch (updateError) {
                  logError(
                    '【IPC Handler】Failed to update assistant message status to error',
                    updateError
                  )
                }
              }

              // 发送错误事件
              logError(
                '【IPC Handler】ai:streamError, requestId:',
                requestId,
                'error:',
                error.message
              )
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
      return toolInfo.type === 'web_search' ? `✅ 网络搜索完成${query}` : `✅ 文件搜索完成${query}`
    }
    case 'terminal': {
      const command = toolInfo.command ? `\n命令：${toolInfo.command}` : ''
      return `✅ 终端命令执行完成${command}`
    }
    default:
      return '✅ 工具调用完成'
  }
}

function getToolCallErrorMessage(toolInfo: ToolCallInfo, errorMessage: string): string {
  const errorDetail = errorMessage ? `\n错误：${errorMessage}` : ''
  switch (toolInfo.type) {
    case 'web_search':
    case 'file_search': {
      const query = toolInfo.query ? `\n查询：${toolInfo.query}` : ''
      return toolInfo.type === 'web_search'
        ? `❌ 网络搜索失败${query}${errorDetail}`
        : `❌ 文件搜索失败${query}${errorDetail}`
    }
    case 'terminal': {
      const command = toolInfo.command ? `\n命令：${toolInfo.command}` : ''
      return `❌ 终端命令执行失败${command}${errorDetail}`
    }
    default:
      return `❌ 工具调用失败${errorDetail}`
  }
}
