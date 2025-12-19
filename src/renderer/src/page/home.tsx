import { LoadingAnimation } from '@renderer/components/loading'
import { useCard } from './use-card'
import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { MessageItem } from '@renderer/chat/message-item'
import '@renderer/assets/chat.css'
import { ChatInput } from '@renderer/chat/chat-input'
import { ThemeProvider } from '@renderer/components/theme-provider'

// 卡片生成
const API_URL =
  'https://dashscope.aliyuncs.com/api/v1/apps/9e85f8fa2dc94c58a0203f7b63b52a4d/completion'

export const Home: React.FC = () => {
  const { messages, sendMessage, status, resetChat } = useCard({
    apiURL: API_URL,
    apiKey: 'sk-cc8fe44c23934b7ab6c3a6397e1e68a3'
  })

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
    <div className="min-h-screen bg-background w-screen">
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
                <div className={clsx('whitespace-pre-wrap msg-content rounded-md ')}>
                  <LoadingAnimation />
                </div>
              </div>
            )}
            {status === 'error' && <div className="">error</div>}
            <div className="" ref={messagesEndRef} />
            <div className="h-[30px] w-1 shrink-0"></div>
          </div>

          <div className="thread-content-max-width mx-auto w-full sticky bottom-0 left-0 right-0">
            <div className="py-4 px-8 bg-background">
              <ChatInput
                sendDisabled={status === 'submitted'}
                resetChat={() => {
                  resetChat()
                }}
                onSend={(content: string) => {
                  if (!content) {
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
