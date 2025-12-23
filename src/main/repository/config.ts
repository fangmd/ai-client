import { prisma } from '@/main/common/db/prisma'
import type { ConfigItem } from '@/types'

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

