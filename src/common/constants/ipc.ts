export const SUCCESS_CODE = 0
export const ERROR_CODE = -1

/**
 * IPC 通道常量定义
 * 命名规范：模块名:操作名
 */
export const IPC_CHANNELS = {
  // AI 模块
  ai: {
    // 请求流式聊天
    streamChat: 'ai:stream-chat',
    // 流式响应事件
    streamChunk: 'ai:stream-chunk',
    streamDone: 'ai:stream-done',
    streamError: 'ai:stream-error',
    // 取消请求
    cancelChat: 'ai:cancel-chat',
    // AI 消息开始
    assistantMessageStart: 'ai:assistant-message-start',
    // 工具调用相关
    toolCallStart: 'ai:tool-call-start',
    toolCallProgress: 'ai:tool-call-progress',
    toolCallComplete: 'ai:tool-call-complete'
  },
  // AI Provider 模块
  aiProvider: {
    // 创建 AI Provider
    create: 'ai-provider:create',
    // 获取所有 AI Provider
    list: 'ai-provider:list',
    // 获取默认 AI Provider
    getDefault: 'ai-provider:get-default',
    // 更新 AI Provider
    update: 'ai-provider:update',
    // 删除 AI Provider
    delete: 'ai-provider:delete',
    // 设置默认 AI Provider
    setDefault: 'ai-provider:set-default'
  },
  // Chat Session 模块
  chatSession: {
    create: 'chat-session:create',
    list: 'chat-session:list',
    get: 'chat-session:get',
    update: 'chat-session:update',
    delete: 'chat-session:delete'
  },
  // Message 模块
  message: {
    create: 'message:create',
    update: 'message:update',
    list: 'message:list',
    append: 'message:append'
  },
  // Config 模块
  config: {
    get: 'config:get',
    getAll: 'config:get-all',
    set: 'config:set',
    delete: 'config:delete'
  },
  // File 模块
  file: {
    upload: 'file:upload',
    select: 'file:select',
    read: 'file:read'
  },
  // MCP Config 模块
  mcpConfig: {
    // 获取所有 MCP 配置
    list: 'mcp-config:list',
    // 创建 MCP 配置
    create: 'mcp-config:create',
    // 更新 MCP 配置
    update: 'mcp-config:update',
    // 删除 MCP 配置
    delete: 'mcp-config:delete'
  },
  // RAG 模块
  rag: {
    createLibrary: 'rag:create-library',
    listLibraries: 'rag:list-libraries',
    updateLibrary: 'rag:update-library',
    deleteLibrary: 'rag:delete-library',
    uploadDocument: 'rag:upload-document',
    listDocuments: 'rag:list-documents',
    deleteDocument: 'rag:delete-document',
    refreshDocument: 'rag:refresh-document',
    getDocumentStatus: 'rag:get-document-status',
    search: 'rag:search'
  }
} as const
