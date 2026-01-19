import { useAIChat } from '@renderer/hooks/use-ai-chat'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { MessageItem } from '@renderer/chat/message-item'
import '@renderer/assets/chat.css'
import { ChatInput } from '@renderer/chat/chat-input'
import { LoadingAnimation } from '@renderer/components/loading'
import type { AIConfig, Attachment, AiProvider } from '@/types'
import { useChatStore } from '@renderer/stores/chatStore'
import { useAiProviderStore } from '@renderer/stores/ai-provider-store'
import { useRagStore } from '@renderer/stores/ragStore'
import { logDebug } from '@renderer/utils'
import { Example_One, Example_Two } from '@renderer/a2ui/example'

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

export const Chat: React.FC = () => {
  const { config, currentAiProviderId, setCurrentAiProviderId, currentSessionId, loadSession } = useChatStore()
  const { providers, loading: loadingProvider, getDefaultProvider } = useAiProviderStore()
  const { selectLibrary } = useRagStore()

  // 根据 currentAiProviderId 获取对应的 provider，若没有则使用默认 provider
  const currentProvider = useMemo(() => {
    if (currentAiProviderId) {
      const provider = providers.find((p) => p.id === currentAiProviderId)
      if (provider) return provider
    }
    // 没有指定 providerId 或找不到时，使用默认 provider
    return getDefaultProvider() ?? null
  }, [currentAiProviderId, providers, getDefaultProvider])

  // 当没有 currentAiProviderId 但有默认 provider 时，设置 currentAiProviderId
  useEffect(() => {
    if (!currentAiProviderId && currentProvider) {
      setCurrentAiProviderId(currentProvider.id)
    }
  }, [currentAiProviderId, currentProvider, setCurrentAiProviderId])

  // 计算 aiConfig 和 hasConfig
  const aiConfig = currentProvider ? buildAIConfig(currentProvider) : config || defaultConfig
  const hasConfig = !!(currentProvider || config)
  const defaultProviderId = currentProvider?.id ?? null

  const { messages, sendMessage, isSending, resetChat } = useAIChat({
    config: aiConfig,
    defaultProviderId
  })

  const loadingMessages = useChatStore((state) => state.loadingMessages)
  const stopStream = useChatStore((state) => state.stopStream)

  const handleStopStream = useCallback(() => {
    stopStream()
  }, [stopStream])

  const updateSession = useChatStore((state) => state.updateSession)
  const sessions = useChatStore((state) => state.sessions)

  // 监控消息和加载状态变化，用于性能分析
  const prevLoadingMessagesRef = useRef(loadingMessages)
  const prevMessagesLengthRef = useRef(messages.length)
  const prevCurrentSessionIdRef = useRef(currentSessionId)

  useEffect(() => {
    prevLoadingMessagesRef.current = loadingMessages
    prevMessagesLengthRef.current = messages.length
    prevCurrentSessionIdRef.current = currentSessionId
  }, [currentSessionId, loadingMessages, messages.length])

  const handleProviderChange = useCallback(
    async (providerId: bigint) => {
      // 更新本地状态
      setCurrentAiProviderId(providerId)
      // 如果有当前会话，同步更新数据库
      if (currentSessionId) {
        await updateSession(currentSessionId, { aiProviderId: providerId })
      }
    },
    [setCurrentAiProviderId, currentSessionId, updateSession]
  )

  const handleLibraryChange = useCallback(
    async (libraryId: bigint | null) => {
      // 如果有当前会话，同步更新数据库
      if (currentSessionId) {
        await updateSession(currentSessionId, { ragLibraryId: libraryId })
      }
    },
    [currentSessionId, updateSession]
  )

  // 当会话切换时，恢复知识库选择
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find((s) => s.id === currentSessionId)
      if (session) {
        selectLibrary(session.ragLibraryId ?? null)
      }
    } else {
      // 没有会话时，重置知识库选择
      selectLibrary(null)
    }
  }, [currentSessionId, sessions, selectLibrary])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef(true)
  const prevLoadingRef = useRef(false)
  const needScrollToBottomRef = useRef(false)
  const isInTwoSecondWindowRef = useRef(false)
  const twoSecondWindowTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastHeightRef = useRef<number>(0)

  // 检查是否在底部附近（距离底部100px内）
  const checkIfNearBottom = () => {
    const container = scrollContainerRef.current
    if (!container) return false

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    return distanceFromBottom < 100
  }

  const scrollToBottom = (behavior: 'smooth' | 'instant' = 'smooth') => {
    const container = scrollContainerRef.current
    if (!container) return

    if (behavior === 'instant') {
      // 直接设置 scrollTop，立即滚动到底部
      container.scrollTop = container.scrollHeight
    } else {
      // 使用 scrollTo 实现平滑滚动
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
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

  // 消息加载完成时，设置标志等待内容渲染后滚动，并启动2秒窗口期
  useEffect(() => {
    // 检测 loadingMessages 从 true 变为 false（加载完成）
    if (prevLoadingRef.current && !loadingMessages && messages.length > 0) {
      logDebug('消息加载完成，等待内容渲染后滚动', messages.length)
      needScrollToBottomRef.current = true
      isInTwoSecondWindowRef.current = true

      // 清除之前的2秒窗口期定时器
      if (twoSecondWindowTimerRef.current) {
        clearTimeout(twoSecondWindowTimerRef.current)
      }

      // 启动2秒窗口期
      twoSecondWindowTimerRef.current = setTimeout(() => {
        logDebug('2秒窗口期结束')
        isInTwoSecondWindowRef.current = false
        // 窗口期结束后，如果还需要滚动，执行最后一次滚动
        if (needScrollToBottomRef.current) {
          const scrollContainer = scrollContainerRef.current
          if (scrollContainer) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                scrollToBottom('instant')
                logDebug('2秒窗口期结束，执行最后一次滚动')
                needScrollToBottomRef.current = false
              })
            })
          }
        }
      }, 2000)
    }
    prevLoadingRef.current = loadingMessages
  }, [loadingMessages, messages.length])

  // 使用 ResizeObserver 监听内容高度变化，确保在 DOM 渲染完成后滚动
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const performScroll = () => {
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer || !needScrollToBottomRef.current) return

      // 使用 requestAnimationFrame 确保在正确的渲染时机执行
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 双重 requestAnimationFrame 确保 DOM 完全渲染
          scrollToBottom('instant')
          logDebug('执行滚动到底部')

          // 如果不在2秒窗口期内，清除滚动标志
          if (!isInTwoSecondWindowRef.current) {
            needScrollToBottomRef.current = false
          }
        })
      })
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!needScrollToBottomRef.current) return

      const entry = entries[0]
      if (!entry) return

      const currentHeight = entry.contentRect.height

      // 如果在2秒窗口期内，任何高度变化都立即执行滚动
      if (isInTwoSecondWindowRef.current) {
        if (currentHeight !== lastHeightRef.current) {
          lastHeightRef.current = currentHeight
          logDebug('2秒窗口期内高度变化，立即执行滚动', currentHeight)
          performScroll()
        }
        return
      }

      // 2秒窗口期外的逻辑：如果高度没有变化，说明内容已经稳定，立即执行滚动
      if (currentHeight === lastHeightRef.current) {
        logDebug('内容高度稳定，立即执行滚动')
        performScroll()
        return
      }

      lastHeightRef.current = currentHeight
      logDebug('内容高度变化', currentHeight)
    })

    resizeObserver.observe(container)
    return () => {
      resizeObserver.disconnect()
      if (twoSecondWindowTimerRef.current) {
        clearTimeout(twoSecondWindowTimerRef.current)
      }
    }
  }, [])

  // 消息增加时，如果用户在底部附近，自动滚动到底部
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom()
    }
  }, [messages])

  const handleSendMessage = (message: string, attachments?: Attachment[]) => {
    sendMessage(message, attachments)
    scrollToBottom()
  }

  // 直接使用 DbMessageWithAttachments，只转换 status 和 timestamp
  const displayMessages = messages.map((msg) => ({
    ...msg,
    timestamp: new Date(msg.createdAt).getTime(),
    status:
      msg.status === 'pending'
        ? ('sending' as const)
        : msg.status === 'error'
          ? ('error' as const)
          : ('done' as const)
  }))

  // test a2ui renderer
  // displayMessages.push({
  //   id: BigInt(1).valueOf() as bigint,
  //   role: 'user',
  //   content: JSON.stringify(Example_One),
  //   contentType: 'a2ui',
  //   createdAt: new Date().toISOString(),
  //   status: 'done'
  // } as any)

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
                onSend={(content: string, attachments?: Attachment[]) => {
                  if ((!content && (!attachments || attachments.length === 0)) || !hasConfig) {
                    return
                  }
                  handleSendMessage(content, attachments)
                }}
                providers={providers}
                currentProviderId={currentAiProviderId}
                onProviderChange={handleProviderChange}
                currentSessionId={currentSessionId}
                onLibraryChange={handleLibraryChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
