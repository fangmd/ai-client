import { useState, useRef, useEffect } from 'react'
import type { Message, AIConfig } from '@/types/chat'
import type { IPCResponse } from '@/preload/types'
import { IPC_CHANNELS } from '@/common/constants/ipc'

type ChatStatus = 'ready' | 'submitted' | 'error'

/**
 * 生成消息 ID
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * AI 聊天 Hook
 * 使用 IPC 与主进程通信
 */
export const useAIChat = (config: AIConfig) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const requestIdRef = useRef<string | null>(null)
  const unsubscribeRefs = useRef<Array<() => void>>([])

  // 组件卸载时取消请求和清理监听器
  useEffect(() => {
    return () => {
      // 取消请求
      if (requestIdRef.current) {
        window.electron.ipcRenderer.send(IPC_CHANNELS.ai.cancelChat, {
          requestId: requestIdRef.current
        })
      }
      // 清理所有监听器
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe())
      unsubscribeRefs.current = []
    }
  }, [])

  /**
   * 发送消息
   */
  const sendMessage = async (content: string) => {
    if (!content.trim() || status === 'submitted') {
      return
    }

    // 取消之前的请求和清理监听器
    if (requestIdRef.current) {
      window.electron.ipcRenderer.send(IPC_CHANNELS.ai.cancelChat, {
        requestId: requestIdRef.current
      })
      // 清理之前的监听器
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe())
      unsubscribeRefs.current = []
    }

    // 添加用户消息
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now()
    }

    setMessages((prev) => [...prev, userMessage])
    setStatus('submitted')

    // 创建助手消息占位符
    const assistantMessageId = generateMessageId()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'sending'
    }

    setMessages((prev) => [...prev, assistantMessage])

    // 准备消息列表（不包含 id 和 timestamp）
    const messageList: Omit<Message, 'id' | 'timestamp'>[] = [
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: userMessage.role,
        content: userMessage.content
      }
    ]

    // 生成请求 ID
    const requestId = generateRequestId()
    requestIdRef.current = requestId

    // 清理之前的监听器
    unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe())
    unsubscribeRefs.current = []

    // 监听流式数据块
    const unsubscribeChunk = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.streamChunk,
      (_event, data: { requestId: string; chunk: string }) => {
        if (data.requestId === requestId) {
          // 更新助手消息内容
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + data.chunk }
                : msg
            )
          )
        }
      }
    )
    unsubscribeRefs.current.push(unsubscribeChunk)

    // 监听完成事件
    const unsubscribeDone = window.electron.ipcRenderer.on(
      IPC_CHANNELS.ai.streamDone,
      (_event, data: { requestId: string }) => {
        if (data.requestId === requestId) {
          // 标记消息为完成
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, status: 'done' as const }
                : msg
            )
          )
          setStatus('ready')
          requestIdRef.current = null
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
      (_event, data: { requestId: string } & IPCResponse) => {
        if (data.requestId === requestId) {
          console.error('AI chat error:', data.msg)
          // 标记消息为错误
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, status: 'error' as const, content: msg.content || `Error: ${data.msg}` }
                : msg
            )
          )
          setStatus('error')
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
  const resetChat = async () => {
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

    setMessages([])
    setStatus('ready')
  }

  return {
    messages,
    sendMessage,
    status,
    resetChat
  }
}
