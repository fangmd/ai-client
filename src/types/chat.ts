export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'sending' | 'done' | 'error'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  status?: MessageStatus
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  baseURL?: string
  model: string
  temperature?: number
  maxTokens?: number
  // OpenAI 特定配置
  openai?: {
    organization?: string
  }
  // 未来其他提供商的特定配置
}
