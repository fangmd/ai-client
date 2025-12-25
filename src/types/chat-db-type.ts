// ==================== 数据库实体类型（主进程/Repository 使用） ====================

import type { 
  MessageRole, 
  MessageContentType, 
  ToolType, 
  ToolCallStatus, 
  AttachmentType,
  Attachment,
  AIConfig,
  ToolCallInfo
} from './chat-frontend-type'

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

// ==================== IPC 传输类型 ====================

/**
 * IPC 传输的 ChatSession 类型
 */
export interface IpcChatSession {
  id: bigint
  title: string
  aiProviderId: bigint
  createdAt: string
  updatedAt: string
}

/**
 * 扩展的 DbMessage 类型（用于 IPC 传输和前端存储）
 * 包含 attachments，且 Date 字段序列化为 string
 * 直接使用 DbMessage 中的分散工具调用字段，不转换为 toolCall 对象
 */
export type DbMessageWithAttachments = Omit<DbMessage, 'createdAt'> & {
  attachments?: Attachment[]  // 附件列表
  createdAt: string  // Date 序列化为 ISO string
}

// ==================== Chat 相关 IPC 请求类型 ====================

/**
 * AI Provider 使用的简化消息类型（只需要 role 和 content）
 */
export type AIMessageInput = {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  attachments?: Attachment[]
}

/**
 * AI 流式聊天请求参数
 */
export interface StreamChatRequest {
  messages: AIMessageInput[]
  config: AIConfig
  requestId: string
  sessionId: bigint
  tools?: ToolType[]
}

/**
 * AI 取消聊天请求参数
 */
export interface CancelChatRequest {
  requestId: string
}

/**
 * 创建消息请求参数
 */
export interface CreateMessageRequest {
  sessionId: bigint
  role: MessageRole
  content: string
  attachments?: Attachment[]
  status?: DbMessageStatus
  totalTokens?: number
  contentType?: MessageContentType
  toolCall?: {
    itemId: string
    type: ToolType
    status: ToolCallStatus
    query?: string
    outputIndex?: number
  }
}

/**
 * 更新消息请求参数
 */
export interface UpdateMessageRequest {
  id: bigint
  data: UpdateMessageData
}

/**
 * 追加消息内容请求参数
 */
export interface AppendMessageRequest {
  id: bigint
  content: string
}

/**
 * 查询消息列表请求参数
 */
export interface ListMessagesRequest {
  sessionId: bigint
}

/**
 * 创建聊天会话请求参数
 */
export interface CreateChatSessionRequest {
  title?: string
  aiProviderId: bigint
}

/**
 * 查询聊天会话列表请求参数
 */
export interface ListChatSessionsRequest {
  limit?: number
  offset?: number
}

/**
 * 查询单个聊天会话请求参数
 */
export interface GetChatSessionRequest {
  id: bigint
}

/**
 * 更新聊天会话请求参数
 */
export interface UpdateChatSessionRequest {
  id: bigint
  data: UpdateChatSessionData
}

/**
 * 删除聊天会话请求参数
 */
export interface DeleteChatSessionRequest {
  id: bigint
}

