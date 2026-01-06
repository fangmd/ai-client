/**
 * MCP 工具固定配置
 * 注意：这是写死的配置，不支持动态配置
 */
export const MCP_TOOL_CONFIG = {
  // 是否启用 MCP 工具
  enabled: true,
  
  // MCP 工具配置列表（可以配置多个 MCP 服务器）
  tools: [
    // 本地 MCP 服务器
    {
      type: 'mcp' as const,
      server_label: 'time-mcp',
      server_description: 'Local MCP server running on localhost:10010',
      server_url: 'http://localhost:10010/mcp',  // 本地服务器地址（直接支持）
      require_approval: 'never' as const
    },
    // 示例：远程 MCP 服务器
    // {
    //   type: 'mcp' as const,
    //   server_label: 'remote_mcp',
    //   server_description: 'Remote MCP server description',
    //   server_url: 'https://mcp-server.example.com/mcp',
    //   require_approval: 'never' as const
    // }
  ]
} as const

/**
 * 获取启用的 MCP 工具配置
 */
export function getMcpToolConfigs() {
  if (!MCP_TOOL_CONFIG.enabled) {
    return []
  }
  return MCP_TOOL_CONFIG.tools
}

