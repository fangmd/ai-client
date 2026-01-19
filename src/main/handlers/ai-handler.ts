import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import { AIProviderFactory } from '@/main/providers'
import { logInfo, logError, logDebug } from '@/main/utils'
import { runWorkerTask } from '@/main/utils/worker-manager'
import { searchHybrid } from '@/main/utils/hybrid-search'
import { getRagDatabase } from '@/main/utils/rag-db'
import { getRagChunksByIds } from '@/main/repository/rag-chunk'
import type { ToolCallInfo, StreamChatRequest, CancelChatRequest, AIMessageInput } from '@/types'
import { createMessage, updateMessage, getMessageById } from '@/main/repository/message'
import { getConfig } from '@/main/repository/config'
import { isA2UIMessage, extractA2UIJSON, A2UI_BEGIN_MARKER } from '@/main/utils/a2ui-detector'

/**
 * 存储活跃的请求，用于取消功能
 */
const activeRequests = new Map<string, AbortController>()

const DEFAULT_RAG_TOP_K = 5
const DEFAULT_RAG_THRESHOLD = 0.2
const RAG_SNIPPET_MAX_LENGTH = 800

async function buildRagContext(options: {
  query: string
  libraryId: bigint
  topK?: number
  threshold?: number
}): Promise<string | null> {
  const embeddings = (await runWorkerTask({
    type: 'embedTexts',
    payload: { texts: [options.query] }
  })) as Float32Array[]

  const results = searchHybrid(
    { text: options.query, embedding: embeddings[0] },
    { topK: options.topK ?? DEFAULT_RAG_TOP_K }
  ).filter((item) => item.score >= (options.threshold ?? DEFAULT_RAG_THRESHOLD))

  if (results.length === 0) return null

  const chunkIds = results.map((item) => item.chunkId)
  const chunks = getRagChunksByIds(chunkIds)
  const chunkMap = new Map(chunks.map((chunk) => [chunk.id, chunk]))

  const db = getRagDatabase()
  const placeholders = chunkIds.map(() => '?').join(',')
  const rows =
    chunkIds.length > 0
      ? db
          .prepare(
            `
            SELECT rag_chunk.id as chunk_id,
                   rag_document.id as document_id,
                   rag_document.library_id as library_id,
                   rag_document.file_name as file_name,
                   rag_document.file_path as file_path
            FROM rag_chunk
            JOIN rag_document ON rag_chunk.document_id = rag_document.id
            WHERE rag_chunk.id IN (${placeholders})
              AND rag_document.library_id = ?
          `
          )
          .all(...chunkIds, options.libraryId)
      : []

  const docMap = new Map<bigint, { fileName: string; filePath: string }>()
  for (const row of rows) {
    docMap.set(row.chunk_id, {
      fileName: row.file_name,
      filePath: row.file_path
    })
  }

  const snippets = results
    .map((result, index) => {
      const chunk = chunkMap.get(result.chunkId)
      const doc = docMap.get(result.chunkId)
      if (!chunk || !doc) return null
      const content = chunk.content.trim().slice(0, RAG_SNIPPET_MAX_LENGTH)
      const metadata =
        chunk.metadata && typeof chunk.metadata === 'object'
          ? ` (行 ${chunk.metadata.startLine ?? '?'}-${chunk.metadata.endLine ?? '?'})`
          : ''
      return `[${index + 1}] ${doc.fileName}${metadata}\n${content}`
    })
    .filter(Boolean)

  if (snippets.length === 0) return null

  return `以下是检索到的参考内容，请结合引用编号回答：\n\n${snippets.join('\n\n')}`
}

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
      const { messages, config, requestId, tools, sessionId, rag } = request

      // 默认启用 terminal 工具和 read 工具
      const finalTools: string[] = tools ? [...tools] : []
      if (!finalTools.includes('terminal')) {
        finalTools.push('terminal')
      }
      if (!finalTools.includes('read')) {
        finalTools.push('read')
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

        // 构建 RAG 上下文
        let ragContext: string | null = null
        if (rag?.enabled && rag.libraryId) {
          const lastUserMessage = [...messages].reverse().find((msg) => msg.role === 'user')
          if (lastUserMessage?.content) {
            ragContext = await buildRagContext({
              query: lastUserMessage.content,
              libraryId: rag.libraryId,
              topK: rag.topK,
              threshold: rag.threshold
            })
          }
        }

        const systemPromptMessage = systemPrompt.trim()
          ? ({ role: 'system', content: systemPrompt.trim() } as AIMessageInput)
          : null
        const ragContextMessage = ragContext
          ? ({ role: 'system', content: ragContext } as AIMessageInput)
          : null

        const finalMessages: AIMessageInput[] = [
          ...(systemPromptMessage ? [systemPromptMessage] : []),
          ...(ragContextMessage ? [ragContextMessage] : []),
          ...messages
        ]

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
        // 用于跟踪是否已经检测到 A2UI 标记并设置了 contentType
        let a2uiContentTypeSet = false
        // 用于累积流式输出的内容，用于检测 A2UI 标记（限制最大长度以避免内存问题）
        let accumulatedContent = ''
        const MAX_ACCUMULATED_LENGTH = 1000 // 最多累积 1000 个字符用于检测标记

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

            onChunk: async (chunk: string) => {
              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug(
              //   '【IPC Handler】ai:streamChunk, requestId:',
              //   requestId,
              //   'chunkLength:',
              //   chunk.length
              // )

              // 累积内容用于检测 A2UI 标记（仅在尚未检测到时累积）
              if (!a2uiContentTypeSet && assistantMessageId) {
                accumulatedContent += chunk
                
                // 限制累积长度，避免内存问题
                if (accumulatedContent.length > MAX_ACCUMULATED_LENGTH) {
                  // 保留最后一部分内容（包含标记的可能性）
                  accumulatedContent = accumulatedContent.slice(-MAX_ACCUMULATED_LENGTH)
                }

                // 检查累积内容中是否包含 A2UI 开始标记
                if (accumulatedContent.includes(A2UI_BEGIN_MARKER)) {
                  try {
                    // 立即设置 contentType 为 'a2ui'
                    await updateMessage(assistantMessageId, {
                      contentType: 'a2ui'
                    })

                    a2uiContentTypeSet = true
                    // 检测到标记后，不再需要累积内容
                    accumulatedContent = ''

                    // 注意：不再次发送 assistantMessageStart 事件，避免前端重复添加消息
                    // 前端会通过检测 chunk 中的 A2UI 标记来自动处理 contentType 更新
                    logInfo('【IPC Handler】A2UI message type detected early and set', {
                      messageId: assistantMessageId.toString(),
                      requestId
                    })
                  } catch (error) {
                    logError('【IPC Handler】Failed to set A2UI contentType early', error)
                  }
                }
              }

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
                // 对于 skill 类型，如果有 skillName，设置 toolQuery
                let toolQuery: string | undefined
                if (toolInfo.type === 'skill' && 'skillName' in toolInfo && toolInfo.skillName) {
                  toolQuery = toolInfo.skillName
                }

                const toolType = toolInfo.type === 'mcp' ? undefined : (toolInfo.type as any)
                const toolMessage = await createMessage({
                  sessionId,
                  role: 'tool',
                  content: getToolCallStartMessage(toolInfo),
                  status: 'pending',
                  contentType: 'tool_call',
                  toolType,
                  toolStatus: toolInfo.status,
                  toolItemId: toolInfo.itemId,
                  toolOutputIndex: toolInfo.outputIndex,
                  toolQuery
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
                  // 根据工具类型获取 toolQuery 值
                  let toolQuery: string | undefined
                  if (toolInfo.type === 'terminal') {
                    toolQuery = toolInfo.command
                  } else if (toolInfo.type === 'read') {
                    toolQuery = toolInfo.filePath
                  } else if (toolInfo.type === 'skill' && 'skillName' in toolInfo) {
                    toolQuery = toolInfo.skillName
                  } else if (toolInfo.type === 'mcp' && 'toolName' in toolInfo) {
                    toolQuery = toolInfo.toolName
                  } else if ('query' in toolInfo) {
                    toolQuery = toolInfo.query
                  }

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

              let finalContent = completeText

              // 如果有 AI 消息，更新状态和内容
              if (assistantMessageId) {
                try {
                  // 确定用于检测的消息内容
                  let messageContent: string | undefined = completeText

                  // 如果没有 completeText，从数据库读取当前消息内容
                  if (!messageContent) {
                    const message = await getMessageById(assistantMessageId)
                    if (message) {
                      messageContent = message.content
                    }
                  }

                  finalContent = messageContent

                  // 如果已经提前设置了 A2UI contentType，需要提取并转换 JSONL 格式
                  if (a2uiContentTypeSet && messageContent) {
                    // 提取纯 JSON 字符串（去掉分隔符）
                    const extractedJSON = extractA2UIJSON(messageContent)
                    if (extractedJSON) {
                      finalContent = extractedJSON
                      logInfo('【IPC Handler】A2UI message JSON extracted', {
                        messageId: assistantMessageId.toString(),
                        originalLength: messageContent.length,
                        extractedLength: extractedJSON.length
                      })
                    }
                  }

                  logInfo('【IPC Handler】finalContent', finalContent)
                  // 更新消息状态和内容（不更新 contentType，因为已经在 onChunk 中设置）
                  await updateMessage(assistantMessageId, {
                    status: 'sent',
                    content: finalContent
                  })

                  logDebug('【IPC Handler】AI assistant message status updated to sent', {
                    messageId: assistantMessageId.toString(),
                    wasDetectedEarly: a2uiContentTypeSet,
                    contentUpdated: a2uiContentTypeSet && finalContent !== messageContent
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
                !!finalContent,
                finalContent
              )
              event.sender.send(IPC_CHANNELS.ai.streamDone, {
                requestId,
                completeText: finalContent || undefined
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
    case 'skill':
      return '📚 正在加载技能...'
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
    case 'skill': {
      const skillName =
        'skillName' in toolInfo && toolInfo.skillName ? `\n技能：${toolInfo.skillName}` : ''
      return `✅ 技能加载完成${skillName}`
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
    case 'skill': {
      const skillName =
        'skillName' in toolInfo && toolInfo.skillName ? `\n技能：${toolInfo.skillName}` : ''
      return `❌ 技能加载失败${skillName}${errorDetail}`
    }
    default:
      return `❌ 工具调用失败${errorDetail}`
  }
}
