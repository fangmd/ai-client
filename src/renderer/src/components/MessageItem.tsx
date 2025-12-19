import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import dayjs from 'dayjs'
import type { Message } from '@renderer/types/chat'
import { cn } from '@renderer/lib/utils'

interface MessageItemProps {
  message: Message
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isSending = message.status === 'sending'

  return (
    <div
      className={cn(
        'flex gap-4 p-4',
        isUser && 'bg-muted/50',
        isAssistant && 'bg-background'
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-primary text-primary-foreground">
        {isUser ? 'U' : 'AI'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">
            {isUser ? 'You' : 'Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {dayjs(message.timestamp).format('HH:mm')}
          </span>
          {isSending && (
            <span className="text-xs text-muted-foreground">(sending...)</span>
          )}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {isAssistant ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || 'Thinking...'}
            </ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  )
}
