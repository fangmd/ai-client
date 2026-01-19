/**
 * 解析和替换 RAG 引用标记
 * 将 AI 返回内容中的引用标记（如 cite turn2search1 turn2search0）替换为可读的引用编号
 */

// NOTE: citation markers may contain special delimiter glyphs like:
// `citeturn2search0` (often from RAG/tooling formatting)

/**
 * 解析引用标记并替换为编号
 * @param content 原始内容
 * @returns 处理后的内容
 */
export function parseCitations(content: string): string {
  if (!content || typeof content !== 'string') {
    return content
  }

  // 匹配引用标记模式（两种都支持）：
  // 1) 纯文本：`cite turn2search1 turn2search0`
  // 2) 带分隔符：`citeturn2search0` / `citeturn2search1turn2search0`
  //
  // 其中 `` `` `` 是常见的特殊分隔符（私有区字符），这里按“任意非字母数字分隔符”兼容处理。
  const citationPattern =
    /(?:\s*)?cite(?:|\s)+(?:turn2search\d+(?:(?:|\s)+turn2search\d+)*)?(?:\s*)?/gi

  // 提取所有唯一的 turn2search 引用（先全局扫描）
  const citations = new Set<string>()
  const globalTurnMatches = content.matchAll(/turn2search\d+/gi)
  for (const match of globalTurnMatches) {
    citations.add(match[0].toLowerCase())
  }

  if (citations.size === 0) {
    return content
  }

  // 将引用排序（按数字顺序）
  const sortedCitations = Array.from(citations).sort((a, b) => {
    const numA = parseInt(a.replace('turn2search', '')) || 0
    const numB = parseInt(b.replace('turn2search', '')) || 0
    return numA - numB
  })

  // 创建引用映射：turn2search0 -> [1], turn2search1 -> [2], ...
  const citationMap = new Map<string, string>()
  sortedCitations.forEach((citation, index) => {
    citationMap.set(citation, `[${index + 1}]`)
  })

  // 替换所有引用标记（从后往前替换，避免位置偏移问题）
  let processedContent = content
  const matches = Array.from(content.matchAll(citationPattern))
  
  // 从后往前替换，避免位置偏移
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i]
    const matchText = match[0]
    
    // 提取这个匹配中的所有 turn2search 引用
    const turnMatches = matchText.match(/turn2search\d+/gi)
    if (turnMatches && turnMatches.length > 0) {
      // 将每个 turn2search 引用替换为对应的编号
      const replacements = turnMatches
        .map((turn) => citationMap.get(turn.toLowerCase()))
        .filter(Boolean) as string[]

      if (replacements.length > 0) {
        // 如果有多个引用，合并显示为 [1][2] 格式
        const replacement = replacements.join('')
        const startIndex = match.index!
        const endIndex = startIndex + matchText.length
        processedContent =
          processedContent.slice(0, startIndex) +
          replacement +
          processedContent.slice(endIndex)
      }
    }
  }

  return processedContent
}
