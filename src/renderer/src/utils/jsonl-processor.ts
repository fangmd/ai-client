import { logWarn } from "./log"

/**
 * JSONL 流式处理器
 * 用于处理流式输入的 JSONL 格式数据（每行一个 JSON 对象）
 */
export class JSONLProcessor {
  private buffer: string = ''

  /**
   * 处理新的 chunk，返回完整的 JSONL 行数组
   * @param chunk 新的数据块
   * @returns 完整的 JSONL 行数组（每行已解析为对象）
   */
  processChunk(chunk: string): any[] {
    // 将新到的 chunk 添加到缓冲区
    this.buffer += chunk

    // 检查缓冲区中是否有换行符
    const lines = this.buffer.split('\n')

    // 关键点：最后一行可能是不完整的，保留在 buffer 中
    // 前面的行是完整的，可以直接处理
    this.buffer = lines.pop() || ''

    const completeLines: any[] = []

    // 处理完整的行
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine) {
        try {
          const jsonObject = JSON.parse(trimmedLine)
          completeLines.push(jsonObject)
        } catch (e) {
          // JSON 解析失败，忽略这一行（可能是格式错误）
          logWarn('Failed to parse JSONL line:', e, 'Line:', trimmedLine)
        }
      }
    }

    return completeLines
  }

  /**
   * 获取当前缓冲区内容（可能包含不完整的行）
   */
  getBuffer(): string {
    return this.buffer
  }

  /**
   * 清空缓冲区
   */
  clearBuffer(): void {
    this.buffer = ''
  }

  /**
   * 处理剩余的缓冲区内容（通常在流结束时调用）
   * @returns 解析出的 JSON 对象，如果缓冲区为空或解析失败则返回 null
   */
  flush(): any | null {
    const trimmed = this.buffer.trim()
    if (!trimmed) {
      return null
    }

    try {
      const jsonObject = JSON.parse(trimmed)
      this.buffer = ''
      return jsonObject
    } catch (e) {
      logWarn('Failed to parse remaining buffer:', e, 'Buffer:', trimmed)
      return null
    }
  }
}
