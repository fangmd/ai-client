import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@renderer/components/ui/button'
import { useChatStore } from '@renderer/stores/chatStore'

export const InputArea: React.FC = () => {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isSending = useChatStore((state) => state.isSending)
  const config = useChatStore((state) => state.config)
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

    // TODO: 使用新的数据库存储方式发送消息
    console.log('Sending message:', userMessage)
    setIsSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStop = () => {
    setIsSending(false)
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
