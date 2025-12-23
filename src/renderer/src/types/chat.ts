/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 消息状态类型
 */
export type MessageStatus = 'sending' | 'done' | 'error'

/**
 * 消息类型（用于 UI 显示）
 */
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  status?: MessageStatus
}

/**
 * 对话会话类型（用于 UI 显示）
 */
export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

/**
 * AI 配置类型
 */
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

