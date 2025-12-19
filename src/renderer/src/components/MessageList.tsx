import React, { useEffect } from 'react'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { MessageItem } from './MessageItem'
import { useChatStore } from '@renderer/stores/chatStore'

export const MessageList: React.FC = () => {
  const messages = useChatStore((state) => state.messages)

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
            <p>Start a conversation...</p>
          </div>
        ) : (
          messages.map((message) => <MessageItem key={message.id} message={message} />)
        )}
      </div>
    </ScrollArea>
  )
}
