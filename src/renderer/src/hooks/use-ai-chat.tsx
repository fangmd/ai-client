import { useRef, useEffect } from 'react'
import type { AIConfig, Attachment } from '@/types'
import type { IPCResponse } from '@/types'
import { IPC_CHANNELS } from '@/common/constants/ipc'
import { useChatStore } from '@renderer/stores/chatStore'
import { useRagStore } from '@renderer/stores/ragStore'
import { logDebug, logInfo } from '@renderer/utils'
import { JSONLProcessor } from '@renderer/utils'

type ChatStatus = 'ready' | 'submitted' | 'error'

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface UseAIChatOptions {
  config: AIConfig
  defaultProviderId: bigint | null
}

/**
 * AI 聊天 Hook
 * 使用 IPC 与主进程通信，支持数据库存储
 */
export const useAIChat = ({ config, defaultProviderId }: UseAIChatOptions) => {
  const {
    messages,
    currentSessionId,
    currentAiProviderId,
    isSending,
    createSession,
    addMessage,
    updateMessage,
    resetChat,
    loadSessions,
    appendToLocalMessage,
    setIsSending,
    registerStopStream,
    unregisterStopStream
  } = useChatStore()
  const { selectedLibraryId, config: ragConfig } = useRagStore()

  const requestIdRef = useRef<string | null>(null)
  const unsubscribeRefs = useRef<Array<() => void>>([])
  const statusRef = useRef<ChatStatus>('ready')

  /**
   * 停止当前流式消息
   */
  const stopCurrentStream = () => {
    if (requestIdRef.current) {
      window.electron.ipcRenderer.send(IPC_CHANNELS.ai.cancelChat, {
        requestId: requestIdRef.current
      })
      requestIdRef.current = null
    }
    // 清理所有监听器
    unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe())
    unsubscribeRefs.current = []
    setIsSending(false)
    statusRef.current = 'ready'
  }

  // 注册停止流式消息的回调函数
  useEffect(() => {
    registerStopStream(stopCurrentStream)
    return () => {
      unregisterStopStream()
    }
  }, [])

  // 组件卸载时取消请求和清理监听器
  useEffect(() => {
    return () => {
      stopCurrentStream()
    }
  }, [])

  /**
   * 发送消息
   */
  const sendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!content.trim() || isSending) {
      return
    }

    // 取消之前的请求和清理监听器
    if (requestIdRef.current) {
      window.electron.ipcRenderer.send(IPC_CHANNELS.ai.cancelChat, {
        requestId: requestIdRef.current
      })
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe())
      unsubscribeRefs.current = []
    }

    setIsSending(true)
    statusRef.current = 'submitted'

    // 获取当前使用的 AI Provider ID
    const aiProviderId = currentAiProviderId || defaultProviderId
    if (!aiProviderId) {
      console.error('No AI Provider ID available')
      setIsSending(false)
      statusRef.current = 'error'
      return
    }

    // 确定会话 ID（延迟创建策略）
    let sessionId = currentSessionId

    // 如果没有当前会话，先创建一个
    if (!sessionId) {
      sessionId = await createSession(aiProviderId)
      if (!sessionId) {
        console.error('Failed to create session')
        setIsSending(false)
        statusRef.current = 'error'
        return
      }
    }

    // 创建用户消息并保存到数据库
    const userMessage = await addMessage(sessionId, {
      role: 'user',
      content: content.trim(),
      attachments,
      status: 'sent'
    })

    if (!userMessage) {
      console.error('Failed to add user message')
      setIsSending(false)
      statusRef.current = 'error'
      return
    }

    // 不再提前创建 AI 消息，将在收到 assistantMessageStart 事件时创建

    // 准备消息列表（用于 AI 请求）
    const messageList = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      attachments: msg.attachments
    }))
    messageList.push({
      role: 'user',
      content: content.trim(),
      attachments
    })

    // 生成请求 ID
    const requestId = generateRequestId()
    requestIdRef.current = requestId

    // A2UI 标记常量
    const A2UI_BEGIN_MARKER = '---BEGIN A2UI---'
    const A2UI_END_MARKER = '---END A2UI---'

    // 用于收集完整的助手回复
    let fullAssistantContent = ''
    // 用于跟踪 AI 消息 ID（从 assistantMessageStart 事件中获取）
    let assistantMessageId: bigint | null = null
    // 用于跟踪消息是否为 a2ui 类型
    let isA2UIMessage = false
    // 清理之前的监听器
    unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe())
    unsubscribeRefs.current = []

    /**
     * 统一处理所有 JSONL 内容（支持流式部分输出）
     * 基于完整的消息内容解析 JSONL 行，即使内容不完整也能输出已解析的部分
     * 每次都重新处理整个内容，确保不遗漏任何行
     * @param content 完整的消息内容（可能还在流式增加中）
     * @returns 解析后的 JSON 数组字符串，如果不是有效的 A2UI 格式则返回 null
     */
    const processAllJSONLContent = (content: string): string | null => {
      if (!content || typeof content !== 'string') {
        return null
      }

      const trimmedContent = content.trim()
      const beginIndex = trimmedContent.indexOf(A2UI_BEGIN_MARKER)
      const endIndex = trimmedContent.indexOf(A2UI_END_MARKER)

      // 检查是否包含 BEGIN 标记（END 标记可能还没有出现）
      if (beginIndex === -1) {
        return null
      }

      // 提取分隔符之间的内容
      const jsonStart = beginIndex + A2UI_BEGIN_MARKER.length
      // 如果找到了 END 标记，只处理到 END 之前；否则处理到内容末尾
      const jsonlEnd = endIndex !== -1 && endIndex > beginIndex ? endIndex : trimmedContent.length
      const jsonlContent = trimmedContent.substring(jsonStart, jsonlEnd).trim()

      if (!jsonlContent) {
        return null
      }

      // 每次都重新处理整个内容，使用新的 JSONLProcessor 实例
      // 这样可以确保不遗漏任何行，虽然会有一些重复处理，但对于流式场景来说是可以接受的
      const jsonlProcessor = new JSONLProcessor()
      const completeLines = jsonlProcessor.processChunk(jsonlContent)
      
      const jsonObjects: any[] = [...completeLines]
      
      // 如果找到了 END 标记，处理剩余的缓冲区内容
      if (endIndex !== -1 && endIndex > beginIndex) {
        const lastObject = jsonlProcessor.flush()
        if (lastObject) {
          jsonObjects.push(lastObject)
        }
      }

      // 如果有已解析的对象，返回 JSON 数组字符串
      if (jsonObjects.length > 0) {
        return JSON.stringify(jsonObjects)
      }

      return null
    }

    /**
     * 更新 A2UI 消息内容
     * 基于完整的消息内容重新解析并更新
     */
    const updateA2UIMessage = () => {
      if (!assistantMessageId || !fullAssistantContent) {
        return
      }

      logInfo('[useAIChat] updateA2UIMessage fullAssistantContent', fullAssistantContent)
      const jsonArrayString = processAllJSONLContent(fullAssistantContent)
      if (jsonArrayString) {
        const { updateLocalMessage } = useChatStore.getState()
        logDebug('[useAIChat] updateA2UIMessage', assistantMessageId, jsonArrayString)
        updateLocalMessage(assistantMessageId, { content: jsonArrayString })
      }
    }

    // 监听 AI 消息开始事件
    const unsubscribeAssistantMessageStart = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.assistantMessageStart,
      (_event, data: { requestId: string; messageId: bigint; message: any }) => {
        if (data.requestId === requestId && data.message) {
          // 设置 AI 消息 ID，用于后续的 chunk 追加
          assistantMessageId = data.messageId

          // 如果后端已经检测到 a2ui 类型（在创建消息时就已经检测到），标记为 A2UI 消息
          if (data.message.contentType === 'a2ui') {
            isA2UIMessage = true
            logDebug('[useAIChat] A2UI message detected from backend')
          }

          // AI 消息已经在后端创建，这里直接添加到本地状态
          const assistantMessage = {
            ...data.message,
            id: data.messageId,
            sessionId
          }
          // 使用 addLocalMessage 避免重复创建数据库记录
          const { addLocalMessage } = useChatStore.getState()
          addLocalMessage(assistantMessage)
        }
      }
    )
    unsubscribeRefs.current.push(unsubscribeAssistantMessageStart)

    // 监听流式数据块
    // 前端节流优化：使用固定时间间隔节流，避免双重批处理导致的不平滑
    let pendingChunks: string[] = []
    let throttleTimer: NodeJS.Timeout | null = null
    const THROTTLE_INTERVAL = 80 // 固定节流间隔 80ms，与后端批处理间隔一致

    const flushPendingChunks = () => {
      if (pendingChunks.length === 0 || !assistantMessageId) {
        throttleTimer = null
        return
      }

      // 合并所有待处理的 chunk
      const combinedChunk = pendingChunks.join('')
      pendingChunks = []

      // 检查是否包含 A2UI BEGIN 标记（如果还没有检测到）
      if (!isA2UIMessage && combinedChunk.includes(A2UI_BEGIN_MARKER)) {
        isA2UIMessage = true
        // 更新本地消息的 contentType，确保前端正确渲染 A2UI 消息
        const { updateLocalMessage } = useChatStore.getState()
        updateLocalMessage(assistantMessageId, { contentType: 'a2ui' })
        logDebug('[useAIChat] A2UI BEGIN marker detected in stream')
      }

      if (isA2UIMessage) {
        // A2UI 消息：基于完整内容重新解析所有 JSONL 行
        updateA2UIMessage()
      } else {
        // 普通消息：直接追加内容
        appendToLocalMessage(assistantMessageId, combinedChunk)
      }

      throttleTimer = null
    }

    const unsubscribeChunk = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.streamChunk,
      (_event, data: { requestId: string; chunk: string }) => {
        logDebug('[useAIChat] streamChunk', data)
        if (data.requestId === requestId) {
          fullAssistantContent += data.chunk
          // 只有在 AI 消息已创建时才追加内容
          if (assistantMessageId) {
            // 累积 chunk 到待处理队列
            pendingChunks.push(data.chunk)

            // 使用固定时间间隔节流，避免双重批处理
            if (throttleTimer === null) {
              throttleTimer = setTimeout(flushPendingChunks, THROTTLE_INTERVAL)
            }
          }
        }
      }
    )
    unsubscribeRefs.current.push(unsubscribeChunk)

    // 监听工具调用开始
    const unsubscribeToolCallStart = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.toolCallStart,
      (_event, data: { requestId: string; messageId: string; message: any }) => {
        if (data.requestId === requestId && data.message) {
          // 工具调用消息已经在后端创建，这里直接添加到本地状态
          const toolMessage = {
            ...data.message,
            id: BigInt(data.messageId),
            sessionId
          }
          // 使用 addLocalMessage 避免重复创建数据库记录
          const { addLocalMessage } = useChatStore.getState()
          addLocalMessage(toolMessage)
        }
      }
    )
    unsubscribeRefs.current.push(unsubscribeToolCallStart)

    // 监听工具调用进度
    const unsubscribeToolCallProgress = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.toolCallProgress,
      (_event, data: { requestId: string; messageId: string; message: any }) => {
        if (data.requestId === requestId && data.message) {
          // 更新本地消息状态，使用分散的工具调用字段
          const messageId = BigInt(data.messageId)
          const { updateLocalMessage } = useChatStore.getState()
          updateLocalMessage(messageId, {
            content: data.message.content,
            toolStatus: data.message.toolStatus,
            toolQuery: data.message.toolQuery
          })
        }
      }
    )
    unsubscribeRefs.current.push(unsubscribeToolCallProgress)

    // 监听工具调用完成
    const unsubscribeToolCallComplete = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.toolCallComplete,
      (_event, data: { requestId: string; messageId: string; message: any }) => {
        if (data.requestId === requestId && data.message) {
          // 更新本地消息状态，使用分散的工具调用字段
          const messageId = BigInt(data.messageId)
          const { updateLocalMessage } = useChatStore.getState()
          updateLocalMessage(messageId, {
            content: data.message.content,
            status: 'sent',
            toolStatus: data.message.toolStatus,
            toolQuery: data.message.toolQuery
          })
        }
      }
    )
    unsubscribeRefs.current.push(unsubscribeToolCallComplete)

    // 监听完成事件
    const unsubscribeDone = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.streamDone,
      async (_event, data: { requestId: string; completeText?: string }) => {
        if (data.requestId === requestId) {
          // 清理待处理的 chunk 和节流定时器
          if (throttleTimer !== null) {
            clearTimeout(throttleTimer)
            throttleTimer = null
          }
          // 如果有待处理的 chunk，立即刷新（仅对普通消息）
          if (pendingChunks.length > 0 && assistantMessageId && !isA2UIMessage) {
            const combinedChunk = pendingChunks.join('')
            pendingChunks = []
            // 普通消息：直接追加内容
            appendToLocalMessage(assistantMessageId, combinedChunk)
          }

          // 如果有完整文本（来自 response.output_text.done 或 response.content_part.done），
          // 使用完整文本替换之前累积的 delta
          const finalContent = data.completeText || fullAssistantContent

          // 只有在 AI 消息已创建时才更新
          if (assistantMessageId) {
            let contentToSave: string

            if (isA2UIMessage && finalContent) {
              // A2UI 消息：使用统一函数处理所有 JSONL 内容
              const jsonArrayString = processAllJSONLContent(finalContent)
              if (jsonArrayString) {
                contentToSave = jsonArrayString
                // 更新本地消息内容
                const { updateLocalMessage } = useChatStore.getState()
                updateLocalMessage(assistantMessageId, { content: contentToSave })
              } else {
                // 如果解析失败，使用原始内容
                contentToSave = finalContent
              }
            } else {
              // 普通消息：使用完整文本
              contentToSave = finalContent
            }

            // 流式响应完成，更新数据库中的助手消息内容和状态
            await updateMessage(assistantMessageId, {
              content: contentToSave,
              status: 'sent'
            })
          }

          setIsSending(false)
          statusRef.current = 'ready'
          requestIdRef.current = null

          // 刷新会话列表
          loadSessions()

          // 清理监听器
          unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe())
          unsubscribeRefs.current = []
        }
      }
    )
    unsubscribeRefs.current.push(unsubscribeDone)

    // 监听错误事件
    const unsubscribeError = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.streamError,
      async (_event, data: { requestId: string } & IPCResponse) => {
        if (data.requestId === requestId) {
          // 清理待处理的 chunk 和节流定时器
          if (throttleTimer !== null) {
            clearTimeout(throttleTimer)
            throttleTimer = null
          }
          // 如果有待处理的 chunk，立即刷新
          if (pendingChunks.length > 0 && assistantMessageId) {
            const combinedChunk = pendingChunks.join('')
            pendingChunks = []
            if (isA2UIMessage) {
              // A2UI 消息：基于完整内容重新解析
              updateA2UIMessage()
            } else {
              // 普通消息：直接追加内容
              appendToLocalMessage(assistantMessageId, combinedChunk)
            }
          }

          console.error('AI chat error:', data.msg)

          // 只有在 AI 消息已创建时才更新
          if (assistantMessageId) {
            // 更新数据库中的助手消息状态为错误
            // 对于 A2UI 消息，使用统一函数处理所有 JSONL 内容；否则使用完整文本或错误信息
            let contentToSave: string
            if (isA2UIMessage && fullAssistantContent) {
              const jsonArrayString = processAllJSONLContent(fullAssistantContent)
              contentToSave = jsonArrayString || fullAssistantContent || `Error: ${data.msg}`
            } else {
              contentToSave = fullAssistantContent || `Error: ${data.msg}`
            }

            await updateMessage(assistantMessageId, {
              content: contentToSave,
              status: 'error'
            })
          }

          setIsSending(false)
          statusRef.current = 'error'
          requestIdRef.current = null

          // 清理监听器
          unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe())
          unsubscribeRefs.current = []
        }
      }
    )
    unsubscribeRefs.current.push(unsubscribeError)

    // 发送流式聊天请求
    window.electron.ipcRenderer.send(IPC_CHANNELS.ai.streamChat, {
      messages: messageList,
      config,
      requestId,
      sessionId,
      rag: {
        enabled: ragConfig.enabled,
        libraryId: selectedLibraryId,
        topK: ragConfig.topK,
        threshold: ragConfig.threshold
      }
    })
  }

  /**
   * 重置聊天
   */
  const handleResetChat = async () => {
    // 取消当前请求
    if (requestIdRef.current) {
      window.electron.ipcRenderer.send(IPC_CHANNELS.ai.cancelChat, {
        requestId: requestIdRef.current
      })
      requestIdRef.current = null
    }

    // 清理所有监听器
    unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe())
    unsubscribeRefs.current = []

    setIsSending(false)
    statusRef.current = 'ready'
    resetChat()
  }

  return {
    messages,
    sendMessage,
    status: statusRef.current,
    isSending,
    resetChat: handleResetChat
  }
}
