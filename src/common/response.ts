import type { IPCResponse } from '../preload/types'
import { SUCCESS_CODE, ERROR_CODE } from './constants/ipc'

/**
 * 创建成功响应
 * @param data 响应数据（自动处理 BigInt 和 Date 的序列化）
 * @param msg 响应消息，默认为 'success'
 */
export function responseSuccess<T = unknown>(data?: T, msg = 'success'): IPCResponse<T> {
  return {
    code: SUCCESS_CODE,
    data: data,
    msg
  }
}

/**
 * 创建错误响应
 * @param error 错误信息，可以是字符串或 Error 对象
 * @param code 错误码，默认为 ERROR_CODE
 */
export function responseError(error: string | Error | unknown, code = ERROR_CODE): IPCResponse {
  const msg =
    typeof error === 'string' ? error : error instanceof Error ? error.message : 'Unknown error'

  return {
    code,
    msg
  }
}
