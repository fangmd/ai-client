/**
 * 格式化日期为相对时间显示
 * - 今天: 显示时间 (如 14:30)
 * - 昨天: 显示 "昨天"
 * - 7天内: 显示 "X天前"
 * - 更早: 显示日期 (如 12月15日)
 */
export const formatRelativeDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}

