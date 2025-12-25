/**
 * 统一响应格式
 */
export interface IPCResponse<T = unknown> {
  code: number
  data?: T
  msg: string
}