import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { SidebarProvider } from '@renderer/components/ui/sidebar'
import { useChatStore } from '@renderer/stores/chatStore'
import { AiModelDialog } from '@renderer/components/AiModelDialog'
import { AppSidebar } from '@renderer/components/AppSidebar'
import { Chat } from '@renderer/page/chat'
import { SettingsPage } from '@renderer/page/settings'

export const Home: React.FC = () => {
  const { resetChat } = useChatStore()
  const [addModelOpen, setAddModelOpen] = useState(false)

  // 新建对话
  const handleNewChat = () => {
    resetChat()
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-screen">
        <AppSidebar onNewChat={handleNewChat} />
        <Routes>
          <Route index element={<Chat />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </div>
      <AiModelDialog
        open={addModelOpen}
        onOpenChange={setAddModelOpen}
      />
    </SidebarProvider>
  )
}
