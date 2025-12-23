import { useAIChat } from '@renderer/hooks/use-ai-chat'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageItem } from '@renderer/chat/message-item'
import '@renderer/assets/chat.css'
import { ChatInput } from '@renderer/chat/chat-input'
import { LoadingAnimation } from '@renderer/components/loading'
import type { AIConfig } from '@/types/chat-type'
import type { AiProvider } from '@/types/ai-provider-type'
import type { IPCResponse } from '@/types'
import { useChatStore } from '@renderer/stores/chatStore'
import { logDebug } from '@renderer/utils'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'

interface ChatProps {
  refreshKey?: number // 用于外部触发刷新 provider
}

// 默认配置
const defaultConfig: AIConfig = {
  provider: 'openai' as const,
  apiKey: '',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2000
}

// 从 Provider 构建 AIConfig
const buildAIConfig = (provider: AiProvider | null): AIConfig => {
  if (!provider) return defaultConfig
  return {
    provider: provider.provider as 'openai' | 'anthropic' | 'custom',
    apiKey: provider.apiKey,
    baseURL: provider.baseURL || undefined,
    model: provider.model,
    temperature: provider.temperature || undefined,
    maxTokens: provider.maxTokens || undefined,
    openai: provider.organization ? { organization: provider.organization } : undefined
  }
}

export const Chat: React.FC<ChatProps> = ({ refreshKey }) => {
  const { config, setCurrentAiProviderId } = useChatStore()
  const [defaultProvider, setDefaultProvider] = useState<AiProvider | null>(null)
  const [loadingProvider, setLoadingProvider] = useState(true)

  // 加载默认 AI Provider
  const loadDefaultProvider = useCallback(async () => {
    try {
      setLoadingProvider(true)
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.getDefault
      )) as IPCResponse<AiProvider | null>

      if (response.code === SUCCESS_CODE && response.data) {
        const provider = response.data
        setDefaultProvider(provider)
        setCurrentAiProviderId(provider.id)
      }
    } catch (error) {
      console.error('Failed to load default provider:', error)
    } finally {
      setLoadingProvider(false)
    }
  }, [setCurrentAiProviderId])

  // 初始化时和 refreshKey 变化时加载 provider
  useEffect(() => {
    loadDefaultProvider()
  }, [refreshKey, loadDefaultProvider])

  // 计算 aiConfig 和 hasConfig
  const aiConfig = defaultProvider ? buildAIConfig(defaultProvider) : config || defaultConfig
  const hasConfig = !!(defaultProvider || config)
  const defaultProviderId = defaultProvider?.id ?? null

  const { messages, sendMessage, isSending, resetChat } = useAIChat({
    config: aiConfig,
    defaultProviderId
  })

  const loadingMessages = useChatStore((state) => state.loadingMessages)
  const stopStream = useChatStore((state) => state.stopStream)

  const handleStopStream = useCallback(() => {
    stopStream()
  }, [stopStream])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef(true)
  const prevLoadingRef = useRef(false)
  const needScrollToBottomRef = useRef(false)

  // 检查是否在底部附近（距离底部100px内）
  const checkIfNearBottom = () => {
    const container = scrollContainerRef.current
    if (!container) return false

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    return distanceFromBottom < 100
  }

  const scrollToBottom = (behavior: 'smooth' | 'instant' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
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

  // 消息加载完成时，设置标志等待内容渲染后滚动
  useEffect(() => {
    // 检测 loadingMessages 从 true 变为 false（加载完成）
    if (prevLoadingRef.current && !loadingMessages && messages.length > 0) {
      logDebug('消息加载完成，等待内容渲染后滚动', messages.length)
      needScrollToBottomRef.current = true
    }
    prevLoadingRef.current = loadingMessages
  }, [loadingMessages, messages.length])

  // 使用 ResizeObserver 监听内容高度变化，确保在 DOM 渲染完成后滚动
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      if (needScrollToBottomRef.current) {
        logDebug('内容高度变化，执行滚动')
        // TODO: 没有找到合适的时机，滚动到底部
        setTimeout(() => {
          scrollToBottom('instant')
        }, 50)
        needScrollToBottomRef.current = false
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
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
    status:
      msg.status === 'pending'
        ? ('sending' as const)
        : msg.status === 'error'
          ? ('error' as const)
          : ('done' as const)
  }))

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="min-h-screen flex flex-col max-h-screen mx-auto w-full">
        <div
          className="flex-1 flex flex-col w-full overflow-y-auto min-h-full"
          ref={scrollContainerRef}
        >
          <div
            className="thread-content-max-width mx-auto flex-1 w-full px-4"
            ref={messagesContainerRef}
          >
            {displayMessages.map((message) => (
              <MessageItem key={String(message.id)} message={message} />
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
                sendDisabled={!hasConfig}
                isSending={isSending}
                onStop={handleStopStream}
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
