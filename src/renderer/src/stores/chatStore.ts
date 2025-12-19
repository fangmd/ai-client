import { create } from 'zustand'
import type { Message, ChatSession, AIConfig } from '@renderer/types/chat'

interface ChatState {
  // 当前会话
  currentSessionId: string | null
  sessions: ChatSession[]

  // AI 配置
  config: AIConfig | null

  // 当前消息列表
  messages: Message[]

  // 是否正在发送
  isSending: boolean

  // Actions
  setConfig: (config: AIConfig) => void
  createSession: (title?: string) => string
  setCurrentSession: (sessionId: string) => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  appendToMessage: (messageId: string, content: string) => void
  clearMessages: () => void
  setIsSending: (isSending: boolean) => void
  deleteSession: (sessionId: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentSessionId: null,
  sessions: [],
  config: null,
  messages: [],
  isSending: false,

  setConfig: (config) => set({ config }),

  createSession: (title) => {
    const sessionId = `session-${Date.now()}`
    const session: ChatSession = {
      id: sessionId,
      title: title || 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: sessionId,
      messages: []
    }))
    return sessionId
  },

  setCurrentSession: (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId)
    if (session) {
      set({
        currentSessionId: sessionId,
        messages: [...session.messages]
      })
    }
  },

  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }

    set((state) => {
      const messages = [...state.messages, newMessage]
      const sessions = state.sessions.map((s) =>
        s.id === state.currentSessionId ? { ...s, messages, updatedAt: Date.now() } : s
      )
      return { messages, sessions }
    })
  },

  updateMessage: (messageId, updates) => {
    set((state) => {
      const messages = state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
      const sessions = state.sessions.map((s) =>
        s.id === state.currentSessionId ? { ...s, messages, updatedAt: Date.now() } : s
      )
      return { messages, sessions }
    })
  },

  appendToMessage: (messageId, content) => {
    set((state) => {
      const messages = state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content: msg.content + content } : msg
      )
      const sessions = state.sessions.map((s) =>
        s.id === state.currentSessionId ? { ...s, messages, updatedAt: Date.now() } : s
      )
      return { messages, sessions }
    })
  },

  clearMessages: () => set({ messages: [] }),

  setIsSending: (isSending) => set({ isSending }),

  deleteSession: (sessionId) => {
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId)
      const currentSessionId =
        state.currentSessionId === sessionId ? sessions[0]?.id || null : state.currentSessionId
      const messages =
        currentSessionId === state.currentSessionId
          ? state.messages
          : sessions.find((s) => s.id === currentSessionId)?.messages || []
      return { sessions, currentSessionId, messages }
    })
  }
}))
