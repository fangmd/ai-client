import type { Message, AIConfig } from '@/types/chat-type'

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

/**
 * 序列化后的 ChatSession 类型（用于 IPC 传输）
 */
export interface SerializedChatSession {
  id: string
  title: string
  aiProviderId: string
  createdAt: string
  updatedAt: string
}

/**
 * 序列化后的 Message 类型（用于 IPC 传输）
 */
export interface SerializedMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  status: 'sent' | 'pending' | 'error' | null
  totalTokens: number | null
  createdAt: string
}

/**
 * ChatSession 模块 IPC 类型
 */
export interface ChatSessionIPC {
  create: {
    request: {
      title?: string
      aiProviderId: string
    }
    response: IPCResponse<SerializedChatSession>
  }
  list: {
    request: {
      limit?: number
      offset?: number
    }
    response: IPCResponse<SerializedChatSession[]>
  }
  get: {
    request: { id: string }
    response: IPCResponse<SerializedChatSession & { messages: SerializedMessage[] }>
  }
  update: {
    request: {
      id: string
      data: {
        title?: string
      }
    }
    response: IPCResponse<SerializedChatSession>
  }
  delete: {
    request: { id: string }
    response: IPCResponse<void>
  }
}

/**
 * Message 模块 IPC 类型
 */
export interface MessageIPC {
  create: {
    request: {
      sessionId: string
      role: 'user' | 'assistant' | 'system'
      content: string
      status?: 'sent' | 'pending' | 'error'
      totalTokens?: number
    }
    response: IPCResponse<SerializedMessage>
  }
  update: {
    request: {
      id: string
      data: {
        content?: string
        status?: 'sent' | 'pending' | 'error'
        totalTokens?: number
      }
    }
    response: IPCResponse<SerializedMessage>
  }
  append: {
    request: {
      id: string
      content: string
    }
    response: IPCResponse<SerializedMessage>
  }
  list: {
    request: { sessionId: string }
    response: IPCResponse<SerializedMessage[]>
  }
}
