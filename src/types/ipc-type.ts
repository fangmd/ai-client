/**
 * 统一响应格式
 */
export interface IPCResponse<T = unknown> {
  code: number
  data?: T
  msg: string
}

/**
 * IPC 传输的 ChatSession 类型
 */
export interface SerializedChatSession {
  id: bigint
  title: string
  aiProviderId: bigint
  createdAt: string
  updatedAt: string
}

/**
 * IPC 传输的 Message 类型
 */
export interface SerializedMessage {
  id: bigint
  sessionId: bigint
  role: 'user' | 'assistant' | 'system'
  content: string
  status: 'sent' | 'pending' | 'error' | null
  totalTokens: number | null
  createdAt: string
}

