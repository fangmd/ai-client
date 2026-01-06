import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { logInfo, logError, logDebug } from '../../utils/logger'
import { getMcpToolConfigs } from '../tools/mcp-config'

/**
 * MCP 客户端（使用 @modelcontextprotocol/sdk）
 */
export class McpClient {
  private clients: Map<string, Client> = new Map()
  private toolsCache: Map<string, any[]> = new Map()
  
  /**
   * 初始化所有 MCP 服务器连接
   */
  async initialize(): Promise<void> {
    const configs = getMcpToolConfigs()
    
    if (configs.length === 0) {
      logInfo('No MCP servers configured, skipping initialization')
      return
    }
    
    for (const config of configs) {
      try {
        logInfo('Connecting to MCP server', {
          label: config.server_label,
          url: config.server_url
        })
        
        // 创建 Streamable HTTP 传输层
        const transport = new StreamableHTTPClientTransport(
          new URL(config.server_url)
        )
        
        // 创建 MCP 客户端
        const client = new Client(
          {
            name: 'ai-client',
            version: '1.0.0'
          },
          {
            capabilities: {}
          }
        )
        
        // 连接到 MCP 服务器
        await client.connect(transport)
        
        this.clients.set(config.server_label, client)
        
        // 获取工具列表
        const tools = await this.getToolsFromServer(client)
        this.toolsCache.set(config.server_label, tools)
        
        logInfo('MCP server connected', {
          label: config.server_label,
          url: config.server_url,
          toolsCount: tools.length
        })
      } catch (error) {
        logError('Failed to connect to MCP server', {
          label: config.server_label,
          url: config.server_url,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
      }
    }
  }
  
  /**
   * 从 MCP 服务器获取工具列表
   */
  private async getToolsFromServer(client: Client): Promise<any[]> {
    try {
      const response = await client.listTools()
      return response.tools || []
    } catch (error) {
      logError('Failed to list tools from MCP server', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return []
    }
  }
  
  /**
   * 调用 MCP 工具
   */
  async callTool(serverLabel: string, toolName: string, args: Record<string, any>): Promise<any> {
    const client = this.clients.get(serverLabel)
    if (!client) {
      throw new Error(`MCP server not found: ${serverLabel}`)
    }
    
    logDebug('Calling MCP tool', { serverLabel, toolName, arguments: args })
    
    try {
      // 调用 MCP 工具
      const result = await client.callTool({
        name: toolName,
        arguments: args
      })
      
      // 格式化结果：MCP 工具返回的是 CallToolResult，包含 content 数组
      // 需要将 content 转换为字符串
      if (result.content && Array.isArray(result.content)) {
        return result.content
          .map((item: any) => {
            if (item.type === 'text') {
              return item.text
            } else if (item.type === 'image') {
              // 图片类型，返回 data URL 或路径
              return item.data || item.url || ''
            }
            return JSON.stringify(item)
          })
          .join('\n')
      }
      
      // 如果返回的是 toolResult（兼容格式）
      if ((result as any).toolResult !== undefined) {
        return JSON.stringify((result as any).toolResult, null, 2)
      }
      
      return JSON.stringify(result, null, 2)
    } catch (error) {
      logError('MCP tool call failed', {
        serverLabel,
        toolName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }
  
  /**
   * 获取所有工具（转换为 Function Calling 格式）
   */
  getToolsAsFunctionCalling(): Array<{
    type: 'function'
    name: string
    description: string
    parameters: any
  }> {
    const tools: any[] = []
    
    for (const [serverLabel, serverTools] of this.toolsCache.entries()) {
      for (const tool of serverTools) {
        // MCP 工具的 inputSchema 是 JSON Schema 格式
        // 需要转换为 OpenAI Function Calling 的 parameters 格式
        const parameters = this.convertMcpSchemaToOpenAI(tool.inputSchema)
        
        tools.push({
          type: 'function' as const,
          name: `mcp_${serverLabel}_${tool.name}`,  // 添加前缀避免冲突
          description: tool.description || '',
          parameters
        })
      }
    }
    
    return tools
  }
  
  /**
   * 将 MCP JSON Schema 转换为 OpenAI Function Calling 的 parameters 格式
   */
  private convertMcpSchemaToOpenAI(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return {
        type: 'object',
        properties: {},
        required: []
      }
    }
    
    // MCP 的 inputSchema 已经是 JSON Schema 格式
    // OpenAI Function Calling 的 parameters 也是 JSON Schema 格式
    // 基本可以直接使用，但需要确保格式正确
    return {
      type: schema.type || 'object',
      properties: schema.properties || {},
      required: schema.required || []
    }
  }
  
  /**
   * 停止所有 MCP 服务器连接
   */
  async disconnect(): Promise<void> {
    for (const [label, client] of this.clients.entries()) {
      try {
        // Client 继承自 Protocol，Protocol 有 close 方法
        await client.close()
        logInfo('MCP server disconnected', { label })
      } catch (error) {
        logError('Failed to disconnect MCP server', { 
          label, 
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    }
    this.clients.clear()
    this.toolsCache.clear()
  }
}

