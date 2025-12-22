/**
 * IPC 类型定义
 */

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
