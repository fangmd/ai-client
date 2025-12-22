export const SUCCESS_CODE = 0
export const ERROR_CODE = -1

/**
 * IPC 通道常量定义
 * 命名规范：模块名:操作名
 */
export const IPC_CHANNELS = {
  // Test 模块
  test: {
    ping: 'test:ping',
    pong: 'test:pong'
  },
  // AI 模块
  ai: {
    // 请求流式聊天
    streamChat: 'ai:stream-chat',
    // 流式响应事件
    streamChunk: 'ai:stream-chunk',
    streamDone: 'ai:stream-done',
    streamError: 'ai:stream-error',
    // 取消请求
    cancelChat: 'ai:cancel-chat'
  }
} as const
