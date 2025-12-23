import { create } from 'zustand'
import type { AIConfig } from '@/types/chat'
import type {
  IPCResponse,
  SerializedChatSession,
  SerializedMessage
} from '@/preload/types'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'

/**
 * 前端使用的 ChatSession 类型
 */
export interface ChatSession {
  id: string
  title: string
  aiProviderId: string
  createdAt: string
  updatedAt: string
}

/**
 * 前端使用的 Message 类型
 */
export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  status: 'sent' | 'pending' | 'error' | null
  totalTokens: number | null
  createdAt: string
}

interface ChatState {
  // 当前会话
  currentSessionId: string | null
  currentAiProviderId: string | null // 当前使用的 AI Provider ID
  sessions: ChatSession[]
  messages: Message[]

  // AI 配置
  config: AIConfig | null

  // 加载状态
  loadingSessions: boolean
  loadingMessages: boolean
  isSending: boolean

  // Actions - 配置
  setConfig: (config: AIConfig) => void
  setCurrentAiProviderId: (aiProviderId: string) => void

  // Actions - 同步数据库
  loadSessions: () => Promise<void>
  loadSession: (id: string) => Promise<void>
  createSession: (aiProviderId: string, title?: string) => Promise<string | null>
  updateSession: (id: string, data: { title?: string }) => Promise<void>
  deleteSession: (id: string) => Promise<void>

  // Actions - 消息管理
  addMessage: (
    sessionId: string,
    message: { role: 'user' | 'assistant' | 'system'; content: string; status?: 'sent' | 'pending' | 'error' }
  ) => Promise<Message | null>
  updateMessage: (id: string, data: { content?: string; status?: 'sent' | 'pending' | 'error'; totalTokens?: number }) => Promise<void>
  appendToMessage: (id: string, content: string) => Promise<void>

  // Actions - 本地状态
  setCurrentSession: (sessionId: string | null) => void
  clearMessages: () => void
  resetChat: () => void
  setIsSending: (isSending: boolean) => void

  // Actions - 本地消息操作（用于流式响应时的实时更新）
  addLocalMessage: (message: Message) => void
  updateLocalMessage: (id: string, updates: Partial<Message>) => void
  appendToLocalMessage: (id: string, content: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentSessionId: null,
  currentAiProviderId: null,
  sessions: [],
  messages: [],
  config: null,
  loadingSessions: false,
  loadingMessages: false,
  isSending: false,

  setConfig: (config) => set({ config }),

  setCurrentAiProviderId: (aiProviderId) => set({ currentAiProviderId: aiProviderId }),

  /**
   * 加载所有会话列表
   */
  loadSessions: async () => {
    set({ loadingSessions: true })
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.chatSession.list,
        {}
      )) as IPCResponse<SerializedChatSession[]>

      if (response.code === SUCCESS_CODE && response.data) {
        set({ sessions: response.data })
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      set({ loadingSessions: false })
    }
  },

  /**
   * 加载单个会话（包含消息）
   */
  loadSession: async (id: string) => {
    set({ loadingMessages: true })
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.chatSession.get,
        { id }
      )) as IPCResponse<SerializedChatSession & { messages: SerializedMessage[] }>

      if (response.code === SUCCESS_CODE && response.data) {
        set({
          currentSessionId: id,
          messages: response.data.messages,
          currentAiProviderId: response.data.aiProviderId
        })
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    } finally {
      set({ loadingMessages: false })
    }
  },

  /**
   * 创建新会话
   */
  createSession: async (aiProviderId: string, title?: string) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.chatSession.create,
        { aiProviderId, title }
      )) as IPCResponse<SerializedChatSession>

      if (response.code === SUCCESS_CODE && response.data) {
        const newSession = response.data
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
          currentAiProviderId: aiProviderId,
          messages: []
        }))
        return newSession.id
      }
      return null
    } catch (error) {
      console.error('Failed to create session:', error)
      return null
    }
  },

  /**
   * 更新会话
   */
  updateSession: async (id: string, data: { title?: string }) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.chatSession.update,
        { id, data }
      )) as IPCResponse<SerializedChatSession>

      if (response.code === SUCCESS_CODE && response.data) {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? response.data! : s
          )
        }))
      }
    } catch (error) {
      console.error('Failed to update session:', error)
    }
  },

  /**
   * 删除会话
   */
  deleteSession: async (id: string) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.chatSession.delete,
        { id }
      )) as IPCResponse<void>

      if (response.code === SUCCESS_CODE) {
        set((state) => {
          const sessions = state.sessions.filter((s) => s.id !== id)
          const isCurrentSession = state.currentSessionId === id
          return {
            sessions,
            currentSessionId: isCurrentSession ? null : state.currentSessionId,
            messages: isCurrentSession ? [] : state.messages
          }
        })
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  },

  /**
   * 添加消息到数据库
   */
  addMessage: async (sessionId, message) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.message.create,
        {
          sessionId,
          role: message.role,
          content: message.content,
          status: message.status || 'sent'
        }
      )) as IPCResponse<SerializedMessage>

      if (response.code === SUCCESS_CODE && response.data) {
        const newMessage = response.data
        set((state) => ({
          messages: [...state.messages, newMessage]
        }))
        // 刷新会话列表以更新 updatedAt
        get().loadSessions()
        return newMessage
      }
      return null
    } catch (error) {
      console.error('Failed to add message:', error)
      return null
    }
  },

  /**
   * 更新消息
   */
  updateMessage: async (id, data) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.message.update,
        { id, data }
      )) as IPCResponse<SerializedMessage>

      if (response.code === SUCCESS_CODE && response.data) {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? response.data! : m
          )
        }))
      }
    } catch (error) {
      console.error('Failed to update message:', error)
    }
  },

  /**
   * 追加消息内容
   */
  appendToMessage: async (id, content) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.message.append,
        { id, content }
      )) as IPCResponse<SerializedMessage>

      if (response.code === SUCCESS_CODE && response.data) {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? response.data! : m
          )
        }))
      }
    } catch (error) {
      console.error('Failed to append message:', error)
    }
  },

  /**
   * 设置当前会话
   */
  setCurrentSession: (sessionId) => {
    if (sessionId) {
      get().loadSession(sessionId)
    } else {
      set({ currentSessionId: null, messages: [] })
    }
  },

  /**
   * 清空消息
   */
  clearMessages: () => set({ messages: [] }),

  /**
   * 重置聊天（准备新对话，不创建数据库记录）
   */
  resetChat: () => {
    set({
      currentSessionId: null,
      messages: []
    })
  },

  setIsSending: (isSending) => set({ isSending }),

  // ========== 本地消息操作（用于流式响应时的实时更新，不调用数据库） ==========

  /**
   * 添加本地消息（不写入数据库）
   */
  addLocalMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }))
  },

  /**
   * 更新本地消息（不写入数据库）
   */
  updateLocalMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      )
    }))
  },

  /**
   * 追加本地消息内容（不写入数据库）
   */
  appendToLocalMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + content } : m
      )
    }))
  }
}))
