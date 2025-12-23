import { useAIChat } from '@renderer/hooks/use-ai-chat'
import { useEffect, useRef } from 'react'
import { MessageItem } from '@renderer/chat/message-item'
import '@renderer/assets/chat.css'
import { ChatInput } from '@renderer/chat/chat-input'
import { LoadingAnimation } from '@renderer/components/loading'
import type { AIConfig } from '@/types/chat'

interface ChatProps {
  aiConfig: AIConfig
  loadingProvider: boolean
  hasConfig: boolean
  defaultProviderId: string | null
}

export const Chat: React.FC<ChatProps> = ({
  aiConfig,
  loadingProvider,
  hasConfig,
  defaultProviderId
}) => {
  const { messages, sendMessage, isSending, resetChat } = useAIChat({
    config: aiConfig,
    defaultProviderId
  })

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef(true)

  // 检查是否在底部附近（距离底部100px内）
  const checkIfNearBottom = () => {
    const container = scrollContainerRef.current
    if (!container) return false

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    return distanceFromBottom < 100
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 监听滚动事件，更新是否在底部附近的状态
  useEffect(() => {
    const container = scrollContainerRef.current

    if (!container) return

    const handleScroll = () => {
      isNearBottomRef.current = checkIfNearBottom()
    }

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

  // 转换消息格式用于 MessageItem 组件
  const displayMessages = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.createdAt).getTime(),
    status: msg.status === 'pending' ? 'sending' as const : msg.status === 'error' ? 'error' as const : 'done' as const
  }))

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="min-h-screen flex flex-col max-h-screen mx-auto w-full">
        <div
          className="flex-1 flex flex-col w-full overflow-y-auto min-h-full"
          ref={scrollContainerRef}
        >
          <div className="thread-content-max-width mx-auto flex-1 w-full px-4">
            {displayMessages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}

            {isSending && messages[messages.length - 1]?.role === 'user' && (
              <div className="Msg__root flex pt-4">
                <div className="whitespace-pre-wrap msg-content rounded-md">
                  <LoadingAnimation />
                </div>
              </div>
            )}

            {loadingProvider && (
              <div className="Msg__root flex pt-4">
                <div className="text-gray-500">加载 AI Provider 配置中...</div>
              </div>
            )}
            <div className="" ref={messagesEndRef} />
            <div className="h-[30px] w-1 shrink-0"></div>
          </div>

          <div className="thread-content-max-width mx-auto w-full sticky bottom-0 left-0 right-0">
            <div className="py-4 px-8 bg-background">
              <ChatInput
                sendDisabled={isSending || !hasConfig}
                resetChat={() => {
                  resetChat()
                }}
                onSend={(content: string) => {
                  if (!content || !hasConfig) {
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
  )
}
