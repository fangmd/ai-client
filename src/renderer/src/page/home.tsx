import { useAIChat } from '@renderer/hooks/use-ai-chat'
import { useEffect, useRef, useState } from 'react'
import { MessageItem } from '@renderer/chat/message-item'
import '@renderer/assets/chat.css'
import { ChatInput } from '@renderer/chat/chat-input'
import { LoadingAnimation } from '@renderer/components/loading'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@renderer/components/ui/sidebar'
import { Settings } from '@renderer/components/Settings'
import { Settings as SettingsIcon } from 'lucide-react'
import { useChatStore } from '@renderer/stores/chatStore'

export const Home: React.FC = () => {
  const config = useChatStore((state) => state.config)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 如果没有配置，使用默认配置
  const defaultConfig = {
    provider: 'openai' as const,
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2000
  }

  const aiConfig = config || defaultConfig

  const { messages, sendMessage, status, resetChat } = useAIChat(aiConfig)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef(true)

  useEffect(() => {
    document.body.style.setProperty('--spacing-custom', `0.25em`)
  }, [])

  // 检查是否在底部附近（距离底部100px内）
  const checkIfNearBottom = () => {
    const container = scrollContainerRef.current
    console.log('container', container)
    if (!container) return false

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    console.log('container distanceFromBottom', distanceFromBottom)
    return distanceFromBottom < 100
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 监听滚动事件，更新是否在底部附近的状态
  useEffect(() => {
    const container = scrollContainerRef.current
    console.log('container', container)

    if (!container) return

    const handleScroll = () => {
      isNearBottomRef.current = checkIfNearBottom()
    }

    console.log('container handleScroll')

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 消息增加时，如果用户在底部附近，自动滚动到底部
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom()
    }
  }, [messages])

  const handleSendMessage = (message: string) => {
    sendMessage(message)
    scrollToBottom()
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-screen">
        <Sidebar variant="inset">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-2">
              <SidebarTrigger />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>菜单</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setSettingsOpen(true)} tooltip="设置">
                      <SettingsIcon />
                      <span>设置</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter />
        </Sidebar>
        <SidebarInset>
          <div className="min-h-screen bg-background w-full">
            <div className="min-h-screen flex flex-col max-h-screen mx-auto w-full">
              <div
                className="flex-1 flex flex-col w-full overflow-y-auto min-h-full"
                ref={scrollContainerRef}
              >
                <div className="thread-content-max-width mx-auto flex-1 w-full px-4">
                  {messages.map((message) => (
                    <MessageItem key={message.id} message={message} />
                  ))}

                  {status === 'submitted' && (
                    <div className="Msg__root flex pt-4">
                      <div className="whitespace-pre-wrap msg-content rounded-md">
                        <LoadingAnimation />
                      </div>
                    </div>
                  )}

                  {status === 'error' && (
                    <div className="Msg__root flex pt-4">
                      <div className="text-red-500">
                        Error: Failed to send message. Please check your configuration.
                      </div>
                    </div>
                  )}
                  {!config && (
                    <div className="Msg__root flex pt-4">
                      <div className="text-yellow-500">
                        Please configure your AI settings before starting a chat.
                        <button
                          onClick={() => setSettingsOpen(true)}
                          className="ml-2 text-blue-500 underline"
                        >
                          Open Settings
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="" ref={messagesEndRef} />
                  <div className="h-[30px] w-1 shrink-0"></div>
                </div>

                <div className="thread-content-max-width mx-auto w-full sticky bottom-0 left-0 right-0">
                  <div className="py-4 px-8 bg-background">
                    <ChatInput
                      sendDisabled={status === 'submitted' || !config}
                      resetChat={() => {
                        resetChat()
                      }}
                      onSend={(content: string) => {
                        if (!content || !config) {
                          return
                        }
                        handleSendMessage(content)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
      <Settings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </SidebarProvider>
  )
}
