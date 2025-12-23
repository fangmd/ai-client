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

/**
 * ChatSession 模块 IPC 类型
 */
export interface ChatSessionIPC {
  create: {
    request: {
      title?: string
      aiProviderId: bigint
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
    request: { id: bigint }
    response: IPCResponse<SerializedChatSession & { messages: SerializedMessage[] }>
  }
  update: {
    request: {
      id: bigint
      data: {
        title?: string
      }
    }
    response: IPCResponse<SerializedChatSession>
  }
  delete: {
    request: { id: bigint }
    response: IPCResponse<void>
  }
}

/**
 * Message 模块 IPC 类型
 */
export interface MessageIPC {
  create: {
    request: {
      sessionId: bigint
      role: 'user' | 'assistant' | 'system'
      content: string
      status?: 'sent' | 'pending' | 'error'
      totalTokens?: number
    }
    response: IPCResponse<SerializedMessage>
  }
  update: {
    request: {
      id: bigint
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
      id: bigint
      content: string
    }
    response: IPCResponse<SerializedMessage>
  }
  list: {
    request: { sessionId: bigint }
    response: IPCResponse<SerializedMessage[]>
  }
}
