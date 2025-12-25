// ==================== 数据库实体类型（主进程/Repository 使用） ====================

import type { 
  MessageRole, 
  MessageContentType, 
  ToolType, 
  ToolCallStatus, 
  AttachmentType,
  Attachment,
  Message,
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
 * IPC 传输的 Message 类型
 */
export interface IpcMessage {
  id: bigint
  sessionId: bigint
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  attachments?: Attachment[]  // 附件列表
  status: 'sent' | 'pending' | 'error' | null
  totalTokens: number | null
  createdAt: string
  
  // 工具调用相关字段
  contentType?: MessageContentType  // 内容类型，默认 'text'
  toolCall?: ToolCallInfo          // 工具调用信息（仅当 contentType 为 'tool_call' 时）
}

// ==================== Chat 相关 IPC 请求类型 ====================

/**
 * AI 流式聊天请求参数
 */
export interface StreamChatRequest {
  messages: Omit<Message, 'id' | 'timestamp'>[]
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

