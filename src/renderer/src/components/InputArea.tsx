import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@renderer/components/ui/button'
import { useChatStore } from '@renderer/stores/chatStore'
import { aiService } from '@renderer/services/aiService'

export const InputArea: React.FC = () => {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const isSending = useChatStore((state) => state.isSending)
  const config = useChatStore((state) => state.config)
  const addMessage = useChatStore((state) => state.addMessage)
  const updateMessage = useChatStore((state) => state.updateMessage)
  const appendToMessage = useChatStore((state) => state.appendToMessage)
  const setIsSending = useChatStore((state) => state.setIsSending)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSend = async () => {
    if (!input.trim() || isSending || !config) return

    const userMessage = input.trim()
    setInput('')
    setIsSending(true)

    // 添加用户消息
    addMessage({
      role: 'user',
      content: userMessage,
      status: 'done'
    })

    // 添加助手消息（占位）
    const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    addMessage({
      role: 'assistant',
      content: '',
      status: 'sending'
    })

    // 设置 AI 配置
    aiService.setConfig(config)

    // 创建 AbortController
    abortControllerRef.current = new AbortController()

    try {
      // 准备消息历史（获取最新状态）
      const currentMessages = useChatStore.getState().messages
      const messageHistory = [
        ...currentMessages,
        { role: 'user' as const, content: userMessage, id: '', timestamp: 0 }
      ]

      // 流式调用
      await aiService.streamChat(messageHistory, {
        onChunk: (chunk) => {
          const currentMessages = useChatStore.getState().messages
          const lastMessage = currentMessages[currentMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            appendToMessage(lastMessage.id, chunk)
          }
        },
        onDone: () => {
          const currentMessages = useChatStore.getState().messages
          const lastMessage = currentMessages[currentMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            updateMessage(lastMessage.id, { status: 'done' })
          }
          setIsSending(false)
        },
        onError: (error) => {
          const currentMessages = useChatStore.getState().messages
          const lastMessage = currentMessages[currentMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            updateMessage(lastMessage.id, {
              status: 'error',
              content: lastMessage.content || `Error: ${error.message}`
            })
          }
          setIsSending(false)
        },
        abortSignal: abortControllerRef.current.signal
      })
    } catch (error) {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsSending(false)
    }
  }

  return (
    <div className="border-t p-4 bg-background">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={config ? "Type your message..." : "Please configure AI settings first"}
          disabled={isSending || !config}
          className="flex-1 min-h-[44px] max-h-[200px] px-4 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          rows={1}
        />
        {isSending ? (
          <Button onClick={handleStop} variant="destructive" size="default">
            Stop
          </Button>
        ) : (
          <Button onClick={handleSend} disabled={!input.trim() || !config} size="default">
            Send
          </Button>
        )}
      </div>
    </div>
  )
}
