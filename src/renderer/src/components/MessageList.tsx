import React from 'react'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { MessageItem } from './MessageItem'
import { useChatStore } from '@renderer/stores/chatStore'
import type { Message as UIMessage } from '@renderer/types/chat'

export const MessageList: React.FC = () => {
  const messages = useChatStore((state) => state.messages)

  // 将 store 中的消息转换为 UI 消息类型
  const displayMessages: UIMessage[] = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.createdAt).getTime(),
    status: msg.status === 'pending' ? 'sending' : msg.status === 'error' ? 'error' : 'done'
  }))

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col">
        {displayMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
            <p>Start a conversation...</p>
          </div>
        ) : (
          displayMessages.map((message) => <MessageItem key={message.id} message={message} />)
        )}
      </div>
    </ScrollArea>
  )
}
