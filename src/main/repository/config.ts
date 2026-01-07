import { prisma } from '@/main/common/db/prisma'
import type { ConfigItem, McpServerConfig } from '@/types'
import { CONFIG_KEYS } from '@/types/config-frontend-type'

/**
 * 获取单个配置
 */
export async function getConfig(key: string): Promise<ConfigItem | null> {
  return prisma.config.findUnique({
    where: { key }
  })
}

/**
 * 获取配置值（带默认值）
 */
export async function getConfigValue<T>(key: string, defaultValue: T): Promise<T> {
  const config = await prisma.config.findUnique({
    where: { key }
  })
  if (!config) {
    return defaultValue
  }
  try {
    return JSON.parse(config.value) as T
  } catch {
    return defaultValue
  }
}

/**
 * 获取所有配置
 */
export async function getAllConfigs(): Promise<Record<string, string>> {
  const configs = await prisma.config.findMany()
  return configs.reduce(
    (acc, config) => {
      acc[config.key] = config.value
      return acc
    },
    {} as Record<string, string>
  )
}

/**
 * 设置配置
 */
export async function setConfig(key: string, value: string): Promise<ConfigItem> {
  return prisma.config.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })
}

/**
 * 删除配置
 */
export async function deleteConfig(key: string): Promise<void> {
  await prisma.config.delete({
    where: { key }
  }).catch(() => {
    // 忽略不存在的配置删除错误
  })
}

// ==================== MCP Config 相关函数 ====================

/**
 * 获取所有 MCP 服务器配置
 */
export async function getMcpConfigs(): Promise<McpServerConfig[]> {
  return getConfigValue<McpServerConfig[]>(CONFIG_KEYS.MCP_SERVERS, [])
}

/**
 * 保存所有 MCP 服务器配置
 */
export async function saveMcpConfigs(configs: McpServerConfig[]): Promise<void> {
  await setConfig(CONFIG_KEYS.MCP_SERVERS, JSON.stringify(configs))
}

/**
 * 添加 MCP 服务器配置
 */
export async function addMcpConfig(config: McpServerConfig): Promise<McpServerConfig> {
  const configs = await getMcpConfigs()
  
  // 检查 server_label 是否已存在
  if (configs.some(c => c.server_label === config.server_label)) {
    throw new Error(`MCP 服务器配置 "${config.server_label}" 已存在`)
  }
  
  // 设置默认值
  const newConfig: McpServerConfig = {
    enabled: true,
    require_approval: 'never',
    ...config
  }
  
  configs.push(newConfig)
  await saveMcpConfigs(configs)
  return newConfig
}

/**
 * 更新 MCP 服务器配置
 */
export async function updateMcpConfig(
  serverLabel: string,
  data: Partial<McpServerConfig>
): Promise<McpServerConfig> {
  const configs = await getMcpConfigs()
  const index = configs.findIndex(c => c.server_label === serverLabel)
  
  if (index === -1) {
    throw new Error(`MCP 服务器配置 "${serverLabel}" 不存在`)
  }
  
  configs[index] = { ...configs[index], ...data }
  await saveMcpConfigs(configs)
  return configs[index]
}

/**
 * 删除 MCP 服务器配置
 */
export async function deleteMcpConfig(serverLabel: string): Promise<void> {
  const configs = await getMcpConfigs()
  const filtered = configs.filter(c => c.server_label !== serverLabel)
  
  if (filtered.length === configs.length) {
    throw new Error(`MCP 服务器配置 "${serverLabel}" 不存在`)
  }
  
  await saveMcpConfigs(filtered)
}

