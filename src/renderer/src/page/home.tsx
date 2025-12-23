import { useEffect, useState } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@renderer/components/ui/sidebar'
import { Plus } from 'lucide-react'
import { useChatStore } from '@renderer/stores/chatStore'
import { AddAiModelDialog } from '@renderer/components/AddAiModelDialog'
import { ChatSessionList } from '@renderer/components/ChatSessionList'
import { Chat } from '@renderer/page/chat'
import type { AIConfig } from '@/types/chat'
import type { AiProvider } from '@/types/ai-provider'
import type { IPCResponse } from '@/preload/types'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'

export const Home: React.FC = () => {
  const { config, resetChat, setCurrentAiProviderId } = useChatStore()
  const [addModelOpen, setAddModelOpen] = useState(false)
  const [defaultProvider, setDefaultProvider] = useState<AiProvider | null>(null)
  const [loadingProvider, setLoadingProvider] = useState(true)

  const loadDefaultProvider = async () => {
    try {
      setLoadingProvider(true)
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.getDefault
      )) as IPCResponse<AiProvider | null>

      if (response.code === SUCCESS_CODE && response.data) {
        const provider = response.data
        setDefaultProvider(provider)
        // 设置当前 AI Provider ID
        setCurrentAiProviderId(provider.id.toString())
      }
    } catch (error) {
      console.error('Failed to load default provider:', error)
    } finally {
      setLoadingProvider(false)
    }
  }

  // 获取默认 AI Provider
  useEffect(() => {
    loadDefaultProvider()
  }, [addModelOpen]) // 当添加模型对话框关闭时重新加载

  // 如果没有配置，使用默认配置
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
      openai: provider.organization
        ? { organization: provider.organization }
        : undefined
    }
  }

  // 优先使用默认 provider，其次使用 store 中的 config，最后使用默认配置
  const aiConfig = defaultProvider ? buildAIConfig(defaultProvider) : (config || defaultConfig)
  const hasConfig = !!(defaultProvider || config)

  // 新建对话
  const handleNewChat = () => {
    resetChat()
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
                    <SidebarMenuButton
                      onClick={() => setAddModelOpen(true)}
                      tooltip="添加 AI Model"
                    >
                      <Plus />
                      <span>添加 AI Model</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>对话</SidebarGroupLabel>
              <SidebarGroupContent>
                <ChatSessionList onNewChat={handleNewChat} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter />
        </Sidebar>
        <Chat
          aiConfig={aiConfig}
          loadingProvider={loadingProvider}
          hasConfig={hasConfig}
          defaultProviderId={defaultProvider?.id.toString() || null}
        />
      </div>
      <AddAiModelDialog
        open={addModelOpen}
        onOpenChange={setAddModelOpen}
        onSuccess={() => {
          loadDefaultProvider()
        }}
      />
    </SidebarProvider>
  )
}
