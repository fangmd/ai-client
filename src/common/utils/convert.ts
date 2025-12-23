/**
 * IPC 序列化：递归处理对象中的特殊类型
 * - Date -> ISO string
 *
 * 注：Electron IPC 使用 structured clone 算法，原生支持 BigInt
 */
export function serializeForIPC<T = unknown>(obj: T): T {
  // 处理 null/undefined
  if (obj === null || obj === undefined) return obj

  // 处理 Date
  if (obj instanceof Date) return obj.toISOString() as T

  // 如果不是对象，直接返回（包括 BigInt）
  if (typeof obj !== 'object') return obj

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeForIPC(item)) as T
  }

  // 处理普通对象
  const newObj: Record<string, unknown> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = serializeForIPC((obj as Record<string, unknown>)[key])
    }
  }
  return newObj as T
}
