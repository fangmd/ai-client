// ==================== 数据库实体类型（主进程/Repository 使用） ====================

import type { 
  MessageRole, 
  MessageContentType, 
  ToolType, 
  ToolCallStatus, 
  AttachmentType,
  AIConfig
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
 * 附件数据（包含数据库字段）
 */
export interface Attachment {
  id: bigint              // 唯一标识 (snowflake)
  type: AttachmentType    // 附件类型
  name: string            // 文件名
  mimeType: string        // MIME 类型 (e.g., 'image/png')
  size: number            // 文件大小 (bytes)
  path: string            // 文件路径（相对路径，用于存储和访问）
  messageId?: bigint      // 所属消息 ID（逻辑外键，可选，创建时不需要）
  createdAt?: Date        // 创建时间（可选，创建时不需要）
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
  path: string            // 文件路径（替代 data）
}

/**
 * Message 更新数据
 */
export type UpdateMessageData = {
  content?: string
  status?: DbMessageStatus
  totalTokens?: number
  
  // 工具调用相关字段
  contentType?: MessageContentType
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

// ==================== File 相关 IPC 请求类型 ====================

/**
 * 文件上传请求参数
 * 注意：只传递文件路径和元信息，不传递文件数据
 */
export interface UploadFileRequest {
  filePath: string      // 用户选择的文件路径（绝对路径）
  name: string          // 文件名
  mimeType: string      // MIME 类型
  size: number         // 文件大小 (bytes)
}

/**
 * 文件上传响应
 */
export interface UploadFileResponse {
  attachmentId: bigint  // 附件 ID
  path: string         // 文件路径（相对路径，用于存储到数据库）
}

/**
 * 文件选择请求参数（使用 dialog API）
 */
export interface SelectFilesRequest {
  filters?: Array<{
    name: string
    extensions: string[]
  }>
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>
}

/**
 * 文件选择响应中的文件信息
 */
export interface SelectedFileInfo {
  path: string         // 文件路径（绝对路径）
  name: string         // 文件名
  size: number         // 文件大小 (bytes)
  mimeType?: string    // MIME 类型（可选，需要根据文件扩展名推断）
}

/**
 * 文件选择响应
 */
export interface SelectFilesResponse {
  files: SelectedFileInfo[]
}

/**
 * 读取文件请求参数（用于前端显示）
 */
export interface ReadFileRequest {
  path: string         // 文件路径（相对路径或绝对路径）
  mimeType: string    // MIME 类型
}

/**
 * 读取文件响应
 */
export interface ReadFileResponse {
  data: string         // Base64 编码的文件内容（不含 data URI 前缀）
}

