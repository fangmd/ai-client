/**
 * 配置项
 */
export interface ConfigItem {
  key: string
  value: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * 配置键常量
 */
export const CONFIG_KEYS = {
  THEME: 'theme'
} as const

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  [CONFIG_KEYS.THEME]: 'system' as ThemeMode
} as const

// ==================== IPC 请求参数类型 ====================

/**
 * 获取配置请求参数
 */
export interface GetConfigRequest {
  key: string
}

/**
 * 设置配置请求参数
 */
export interface SetConfigRequest {
  key: string
  value: string
}

/**
 * 删除配置请求参数
 */
export interface DeleteConfigRequest {
  key: string
}

