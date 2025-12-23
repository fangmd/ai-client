import React from 'react'
import { MessageList } from './MessageList'
import { InputArea } from './InputArea'
import { Settings } from './Settings'
import { Button } from '@renderer/components/ui/button'
import { useChatStore } from '@renderer/stores/chatStore'

export const ChatWindow: React.FC = () => {
  const resetChat = useChatStore((state) => state.resetChat)

  const handleNewChat = () => {
    resetChat()
  }

  return (
    <div className="flex flex-col h-screen w-screen">
      <header className="border-b p-4 flex items-center justify-between bg-background">
        <h1 className="text-xl font-semibold">AI Chat Client</h1>
        <div className="flex gap-2">
          <Button onClick={handleNewChat} variant="outline" size="sm">
            New Chat
          </Button>
          <Settings />
        </div>
      </header>
      <div className="flex-1 overflow-hidden min-h-0">
        <MessageList />
      </div>
      <InputArea />
    </div>
  )
}
