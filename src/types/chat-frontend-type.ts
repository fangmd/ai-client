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

