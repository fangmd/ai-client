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
export type ToolType = 'web_search' | 'file_search' | 'terminal' | 'read'

/**
 * 工具调用状态
 */
export type ToolCallStatus = 'in_progress' | 'searching' | 'completed' | 'failed'

/**
 * 终端工具调用信息
 */
export interface TerminalToolCallInfo {
  itemId: string              // 工具调用的唯一标识
  type: 'terminal'            // 工具类型
  status: ToolCallStatus      // 当前状态
  command?: string            // 执行的命令（完成时才有）
  workingDirectory?: string   // 工作目录
  outputIndex?: number        // 在输出中的索引位置
  timestamp?: number           // 时间戳
}

/**
 * 文件读取工具调用信息
 */
export interface ReadToolCallInfo {
  itemId: string              // 工具调用的唯一标识
  type: 'read'                // 工具类型
  status: ToolCallStatus      // 当前状态
  filePath?: string           // 读取的文件路径（完成时才有）
  offset?: number             // 起始行号
  limit?: number              // 读取行数
  outputIndex?: number        // 在输出中的索引位置
  timestamp?: number          // 时间戳
}

/**
 * 工具调用信息
 */
export type ToolCallInfo = 
  | {
      itemId: string
      type: 'web_search' | 'file_search'
      status: ToolCallStatus
      query?: string
      outputIndex?: number
      timestamp?: number
    }
  | TerminalToolCallInfo
  | ReadToolCallInfo

/**
 * 附件类型
 */
export type AttachmentType = 'image' | 'file'

// Attachment 类型从 chat-db-type 导入
export type { Attachment } from './chat-db-type'

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

