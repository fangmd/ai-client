/**
 * IPC 通道常量定义
 * 命名规范：模块名:操作名
 */
export const IPC_CHANNELS = {
  // Test 模块
  test: {
    ping: 'test:ping',
    pong: 'test:pong'
  }
} as const
