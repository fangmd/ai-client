import { useRef, useEffect } from 'react'
import type { AIConfig } from '@/types/chat-type'
import type { IPCResponse } from '@/types'
import { IPC_CHANNELS } from '@/common/constants/ipc'
import { useChatStore } from '@renderer/stores/chatStore'

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
  const sendMessage = async (content: string) => {
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
      status: 'sent'
    })

    if (!userMessage) {
      console.error('Failed to add user message')
      setIsSending(false)
      statusRef.current = 'error'
      return
    }

    // 提前创建空的助手消息并保存到数据库（状态为 pending）
    const assistantMessage = await addMessage(sessionId, {
      role: 'assistant',
      content: '',
      status: 'pending'
    })

    if (!assistantMessage) {
      console.error('Failed to create assistant message')
      setIsSending(false)
      statusRef.current = 'error'
      return
    }

    const assistantMessageId = assistantMessage.id

    // 准备消息列表（用于 AI 请求，排除刚创建的空助手消息）
    const messageList = messages
      .filter((msg) => msg.id !== assistantMessageId)
      .map((msg) => ({
        role: msg.role,
        content: msg.content
      }))
    messageList.push({
      role: 'user',
      content: content.trim()
    })

    // 生成请求 ID
    const requestId = generateRequestId()
    requestIdRef.current = requestId

    // 用于收集完整的助手回复
    let fullAssistantContent = ''

    // 清理之前的监听器
    unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe())
    unsubscribeRefs.current = []

    // 监听流式数据块
    const unsubscribeChunk = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.streamChunk,
      (_event, data: { requestId: string; chunk: string }) => {
        if (data.requestId === requestId) {
          fullAssistantContent += data.chunk
          appendToLocalMessage(assistantMessageId, data.chunk)
        }
      }
    )
    unsubscribeRefs.current.push(unsubscribeChunk)

    // 监听完成事件
    const unsubscribeDone = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.streamDone,
      async (_event, data: { requestId: string }) => {
        if (data.requestId === requestId) {
          // 流式响应完成，更新数据库中的助手消息内容和状态
          await updateMessage(assistantMessageId, {
            content: fullAssistantContent,
            status: 'sent'
          })

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
          console.error('AI chat error:', data.msg)

          // 更新数据库中的助手消息状态为错误
          await updateMessage(assistantMessageId, {
            content: fullAssistantContent || `Error: ${data.msg}`,
            status: 'error'
          })

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
      requestId
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
