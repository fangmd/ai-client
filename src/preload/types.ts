import type { Message, AIConfig } from '@/types/chat'

/**
 * 统一响应格式
 */
export interface IPCResponse<T = unknown> {
  code: number
  data?: T
  msg: string
}

/**
 * Test 模块 IPC 类型
 */
export interface TestIPC {
  ping: {
    request: void
    response: IPCResponse<{ message: string }>
  }
}

/**
 * AI 模块 IPC 类型
 */
export interface AIIPC {
  streamChat: {
    request: {
      messages: Omit<Message, 'id' | 'timestamp'>[]
      config: AIConfig
      requestId: string
    }
    response: IPCResponse<void> // 流式响应通过事件发送
  }
  cancelChat: {
    request: { requestId: string }
    response: IPCResponse<void>
  }
}
