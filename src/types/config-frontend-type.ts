// ==================== Config 前端类型（渲染进程使用） ====================

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * 配置键常量
 */
export const CONFIG_KEYS = {
  THEME: 'theme',
  SYSTEM_PROMPT: 'system_prompt'
} as const

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  [CONFIG_KEYS.THEME]: 'system' as ThemeMode,
  [CONFIG_KEYS.SYSTEM_PROMPT]: ''
} as const

