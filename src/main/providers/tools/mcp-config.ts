import { getMcpConfigs } from '@/main/repository/config'

/**
 * MCP 工具配置类型（兼容旧格式）
 */
export interface McpToolConfig {
  type: 'mcp'
  server_label: string
  server_description?: string
  server_url: string
  require_approval: 'always' | 'never'
}

/**
 * 获取启用的 MCP 工具配置
 * 从数据库读取配置，仅返回启用状态的配置
 */
export async function getMcpToolConfigs(): Promise<McpToolConfig[]> {
  try {
    const configs = await getMcpConfigs()
    
    // 过滤出启用状态的配置，并转换为工具配置格式
    return configs
      .filter(config => config.enabled !== false)
      .map(config => ({
        type: 'mcp' as const,
        server_label: config.server_label,
        server_description: config.server_description,
        server_url: config.server_url,
        require_approval: config.require_approval || 'never'
      }))
  } catch (error) {
    // 如果读取失败，返回空数组
    console.error('Failed to load MCP configs:', error)
    return []
  }
}

