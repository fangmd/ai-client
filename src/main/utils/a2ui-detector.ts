import { logDebug } from '@/main/utils'

/**
 * A2UI 消息操作类型
 */
const A2UI_ACTION_TYPES = ['beginRendering', 'surfaceUpdate', 'dataModelUpdate', 'deleteSurface'] as const

/**
 * A2UI 消息分隔符
 */
export const A2UI_BEGIN_MARKER = '---BEGIN A2UI---'
export const A2UI_END_MARKER = '---END A2UI---'

/**
 * 从消息内容中提取 A2UI JSONL 内容并转换为 JSON 数组格式
 * 
 * 支持格式：
 * 带分隔符格式：---BEGIN A2UI---\n{...}\n{...}\n---END A2UI---
 * 
 * @param content 消息内容
 * @returns 转换后的 JSON 数组字符串，如果无法提取则返回 null
 */
export function extractA2UIJSON(content: string): string | null {
  if (!content || typeof content !== 'string') {
    return null
  }

  const trimmedContent = content.trim()

  // 检查是否包含分隔符
  const beginIndex = trimmedContent.indexOf(A2UI_BEGIN_MARKER)
  const endIndex = trimmedContent.indexOf(A2UI_END_MARKER)

  if (beginIndex !== -1 && endIndex !== -1 && endIndex > beginIndex) {
    // 提取分隔符之间的内容
    const jsonStart = beginIndex + A2UI_BEGIN_MARKER.length
    const jsonlContent = trimmedContent.substring(jsonStart, endIndex).trim()
    
    if (!jsonlContent) {
      return null
    }

    // 将 JSONL 格式（每行一个 JSON 对象）转换为 JSON 数组格式
    const lines = jsonlContent.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    const jsonObjects: any[] = []

    for (const line of lines) {
      try {
        const obj = JSON.parse(line)
        jsonObjects.push(obj)
      } catch (error) {
        logDebug('[A2UI Detector] Failed to parse JSONL line', { line, error })
        return null
      }
    }

    if (jsonObjects.length === 0) {
      return null
    }

    const jsonArrayString = JSON.stringify(jsonObjects)
    logDebug('[A2UI Detector] Extracted and converted JSONL to JSON array', {
      jsonlLength: jsonlContent.length,
      lineCount: lines.length,
      jsonArrayLength: jsonArrayString.length
    })
    return jsonArrayString
  }

  return null
}

/**
 * 检测消息内容是否为有效的 A2UI 消息格式
 * 
 * A2UI 消息必须：
 * 1. 被 ---BEGIN A2UI--- 和 ---END A2UI--- 分隔符包裹
 * 2. 分隔符之间的内容是有效的 JSONL 格式（每行一个 JSON 对象）
 * 3. 每行的 JSON 对象必须包含且仅包含以下操作之一：
 *    - beginRendering
 *    - surfaceUpdate
 *    - dataModelUpdate
 *    - deleteSurface
 * 
 * @param content 消息内容
 * @returns 如果内容符合 A2UI 格式返回 true，否则返回 false
 */
export function isA2UIMessage(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false
  }

  const trimmedContent = content.trim()

  // 检查是否包含分隔符
  const beginIndex = trimmedContent.indexOf(A2UI_BEGIN_MARKER)
  const endIndex = trimmedContent.indexOf(A2UI_END_MARKER)

  if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
    logDebug('[A2UI Detector] Content does not contain valid A2UI delimiters')
    return false
  }

  // 提取分隔符之间的内容
  const jsonStart = beginIndex + A2UI_BEGIN_MARKER.length
  const jsonlContent = trimmedContent.substring(jsonStart, endIndex).trim()

  if (!jsonlContent) {
    logDebug('[A2UI Detector] Content between delimiters is empty')
    return false
  }

  // 将 JSONL 格式按行分割
  const lines = jsonlContent.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  if (lines.length === 0) {
    logDebug('[A2UI Detector] No valid lines in JSONL content')
    return false
  }

  // 验证每一行都是有效的 JSON 对象，且包含且仅包含一个 A2UI 操作类型
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 尝试解析 JSON
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch (error) {
      logDebug('[A2UI Detector] Line is not valid JSON', { lineIndex: i, line, error })
      return false
    }

    // 必须是对象
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      logDebug('[A2UI Detector] Line is not a JSON object', { lineIndex: i, line })
      return false
    }

    // 检查对象是否包含且仅包含一个 A2UI 操作类型
    const keys = Object.keys(parsed)
    const actionKeys = keys.filter(key => A2UI_ACTION_TYPES.includes(key as any))

    // 必须包含且仅包含一个 A2UI 操作类型
    if (actionKeys.length !== 1) {
      logDebug('[A2UI Detector] Line does not contain exactly one A2UI action', {
        lineIndex: i,
        keys,
        actionKeys
      })
      return false
    }
  }

  // 所有检查通过，是有效的 A2UI 消息
  logDebug('[A2UI Detector] Content is valid A2UI message', {
    lineCount: lines.length
  })
  return true
}
