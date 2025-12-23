// ==================== 前端类型（渲染进程使用） ====================

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 消息状态类型（前端）
 */
export type MessageStatus = 'sending' | 'done' | 'error'

/**
 * 消息类型（前端）
 */
export interface Message {
  id: bigint
  role: MessageRole
  content: string
  timestamp: number
  status?: MessageStatus
}

/**
 * 聊天会话类型（前端）
 */
export interface ChatSession {
  id: bigint
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

/**
 * AI 配置类型（前端）
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

// ==================== 数据库实体类型（主进程/Repository 使用） ====================

/**
 * 数据库消息状态类型
 */
export type DbMessageStatus = 'sent' | 'pending' | 'error'

/**
 * 数据库 Message 类型
 */
export type DbMessage = {
  id: bigint
  sessionId: bigint
  role: string
  content: string
  status: string | null
  totalTokens: number | null
  createdAt: Date
}

/**
 * Message 创建数据
 */
export type CreateMessageData = {
  sessionId: bigint
  role: MessageRole
  content: string
  status?: DbMessageStatus
  totalTokens?: number
}

/**
 * Message 更新数据
 */
export type UpdateMessageData = {
  content?: string
  status?: DbMessageStatus
  totalTokens?: number
}

/**
 * 数据库 ChatSession 类型
 */
export type DbChatSession = {
  id: bigint
  title: string
  aiProviderId: bigint
  createdAt: Date
  updatedAt: Date
}

/**
 * ChatSession 创建数据
 */
export type CreateChatSessionData = {
  title?: string
  aiProviderId: bigint
}

/**
 * ChatSession 更新数据
 */
export type UpdateChatSessionData = {
  title?: string
}
