import { logDebug, logInfo } from '@/main/utils'

/**
 * A2UI 消息操作类型
 */
const A2UI_ACTION_TYPES = ['beginRendering', 'surfaceUpdate', 'dataModelUpdate', 'deleteSurface'] as const

/**
 * A2UI 消息分隔符
 */
const A2UI_BEGIN_MARKER = '---BEGIN A2UI---'
const A2UI_END_MARKER = '---END A2UI---'

/**
 * 从消息内容中提取 A2UI JSON 字符串
 * 
 * 支持两种格式：
 * 1. 带分隔符格式：---BEGIN A2UI---\n[...JSON...]\n---END A2UI---
 * 2. 纯 JSON 格式：[...JSON...]（向后兼容）
 * 
 * @param content 消息内容
 * @returns 提取的 JSON 字符串，如果无法提取则返回 null
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
    const jsonContent = trimmedContent.substring(jsonStart, endIndex).trim()
    
    if (jsonContent) {
      logDebug('[A2UI Detector] Extracted JSON from delimited format', {
        jsonLength: jsonContent.length
      })
      return jsonContent
    }
    return null
  }

  // 如果没有分隔符，返回原始内容（向后兼容，用于纯 JSON 格式）
  // 注意：这种情况下，调用者应该先通过 isA2UIMessage 验证
  return trimmedContent
}

/**
 * 检测消息内容是否为有效的 A2UI 消息格式
 * 
 * A2UI 消息必须：
 * 1. 是有效的 JSON 数组（可能被 ---BEGIN A2UI--- 和 ---END A2UI--- 分隔符包裹）
 * 2. 数组中的每个对象必须包含且仅包含以下操作之一：
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

  // 提取 JSON 字符串（支持分隔符格式）
  const jsonContent = extractA2UIJSON(content)
  logInfo('【A2UI Detector】isA2UIMessage', { content, jsonContent })
  if (!jsonContent) {
    return false
  }

  // 尝试解析 JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonContent)
  } catch (error) {
    // 不是有效的 JSON，不是 A2UI 消息
    logDebug('[A2UI Detector] Content is not valid JSON', { error })
    return false
  }

  // 必须是数组
  if (!Array.isArray(parsed)) {
    logDebug('[A2UI Detector] Content is not an array')
    return false
  }

  // 空数组不是有效的 A2UI 消息
  if (parsed.length === 0) {
    logDebug('[A2UI Detector] Content is an empty array')
    return false
  }

  // 验证数组中的每个对象
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i]

    // 必须是对象
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      logDebug('[A2UI Detector] Item is not an object', { index: i })
      return false
    }

    // 检查对象是否包含且仅包含一个 A2UI 操作类型
    const keys = Object.keys(item)
    const actionKeys = keys.filter(key => A2UI_ACTION_TYPES.includes(key as any))

    // 必须包含且仅包含一个 A2UI 操作类型
    if (actionKeys.length !== 1) {
      logDebug('[A2UI Detector] Item does not contain exactly one A2UI action', {
        index: i,
        keys,
        actionKeys
      })
      return false
    }
  }

  // 所有检查通过，是有效的 A2UI 消息
  logDebug('[A2UI Detector] Content is valid A2UI message', {
    messageCount: parsed.length
  })
  return true
}
