// ==================== 前端类型（渲染进程使用） ====================

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

/**
 * 消息状态类型（前端）
 */
export type MessageStatus = 'sending' | 'done' | 'error'

/**
 * 消息内容类型
 */
export type MessageContentType = 'text' | 'tool_call'

/**
 * 工具类型
 */
export type ToolType = 'web_search' | 'file_search'

/**
 * 工具调用状态
 */
export type ToolCallStatus = 'in_progress' | 'searching' | 'completed' | 'failed'

/**
 * 工具调用信息
 */
export interface ToolCallInfo {
  itemId: string          // 工具调用的唯一标识
  type: ToolType          // 工具类型
  status: ToolCallStatus  // 当前状态
  query?: string          // 搜索查询内容（完成时才有）
  outputIndex?: number    // 在输出中的索引位置
  timestamp?: number      // 时间戳
}

/**
 * 附件类型
 */
export type AttachmentType = 'image' | 'file'

/**
 * 附件数据
 */
export interface Attachment {
  id: bigint              // 唯一标识 (snowflake)
  type: AttachmentType    // 附件类型
  name: string            // 文件名
  mimeType: string        // MIME 类型 (e.g., 'image/png')
  size: number            // 文件大小 (bytes)
  data: string            // Base64 编码的文件内容
}

/**
 * 消息类型（前端）
 */
export interface Message {
  id: bigint
  role: MessageRole
  content: string
  timestamp: number
  status?: MessageStatus
  attachments?: Attachment[]  // 附件列表
  
  // 工具调用相关字段
  contentType?: MessageContentType  // 内容类型，默认 'text'
  toolCall?: ToolCallInfo          // 工具调用信息（仅当 contentType 为 'tool_call' 时）
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
  
  // 工具调用相关字段
  contentType: string | null
  toolType: string | null
  toolStatus: string | null
  toolQuery: string | null
  toolItemId: string | null
  toolOutputIndex: number | null
}

/**
 * 数据库 Attachment 类型
 */
export type DbAttachment = {
  id: bigint
  messageId: bigint
  type: string
  name: string
  mimeType: string
  size: number
  data: string
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
  
  // 工具调用相关字段
  contentType?: MessageContentType
  toolType?: ToolType
  toolStatus?: ToolCallStatus
  toolItemId?: string
  toolOutputIndex?: number
  toolQuery?: string
}

/**
 * Attachment 创建数据
 */
export type CreateAttachmentData = {
  messageId: bigint
  type: AttachmentType
  name: string
  mimeType: string
  size: number
  data: string
}

/**
 * Message 更新数据
 */
export type UpdateMessageData = {
  content?: string
  status?: DbMessageStatus
  totalTokens?: number
  
  // 工具调用相关字段
  toolStatus?: ToolCallStatus
  toolQuery?: string
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
  aiProviderId?: bigint
}
