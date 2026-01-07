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
  SYSTEM_PROMPT: 'system_prompt',
  MCP_SERVERS: 'mcp_servers'
} as const

/**
 * MCP 服务器配置
 */
export interface McpServerConfig {
  server_label: string
  server_description?: string
  server_url: string
  require_approval?: 'always' | 'never'
  enabled?: boolean
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  [CONFIG_KEYS.THEME]: 'system' as ThemeMode,
  [CONFIG_KEYS.SYSTEM_PROMPT]: '',
  [CONFIG_KEYS.MCP_SERVERS]: [] as McpServerConfig[]
} as const

