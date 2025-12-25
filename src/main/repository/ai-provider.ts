import { prisma } from '@/main/common/db/prisma'
import { generateUUID } from '@/main/utils/snowflake'
import type { CreateAiProviderData, UpdateAiProviderData } from '@/types'

/**
 * 创建 AI Provider
 */
export async function createAiProvider(data: Omit<CreateAiProviderData, 'id'>) {
  return prisma.aiProvider.create({
    data: {
      ...data,
      id: generateUUID().valueOf()
    }
  })
}

/**
 * 查询所有 AI Provider
 */
export async function getAllAiProviders() {
  return prisma.aiProvider.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  })
}

/**
 * 根据 ID 查询 AI Provider
 */
export async function getAiProviderById(id: bigint) {
  return prisma.aiProvider.findUnique({
    where: { id }
  })
}

/**
 * 查询默认 AI Provider
 */
export async function getDefaultAiProvider() {
  return prisma.aiProvider.findFirst({
    where: {
      isDefault: true
    }
  })
}

/**
 * 根据提供商类型查询 AI Provider
 */
export async function getAiProvidersByType(provider: string) {
  return prisma.aiProvider.findMany({
    where: {
      provider
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

/**
 * 更新 AI Provider
 */
export async function updateAiProvider(id: bigint, data: UpdateAiProviderData) {
  // 将 temperature 的 undefined 转换为 null，确保 Prisma 正确更新字段
  // （Prisma 会忽略 undefined 值，但会更新 null 值）
  const updateData = {
    ...data,
    temperature: data.temperature === undefined ? null : data.temperature
  }

  return prisma.aiProvider.update({
    where: { id },
    data: updateData
  })
}

/**
 * 删除 AI Provider
 */
export async function deleteAiProvider(id: bigint) {
  return prisma.aiProvider.delete({
    where: { id }
  })
}

/**
 * 设置默认 AI Provider
 * 会自动取消其他 Provider 的默认状态
 */
export async function setDefaultAiProvider(id: bigint) {
  // 使用事务确保数据一致性
  return prisma.$transaction(async (tx) => {
    // 先取消所有默认状态
    await tx.aiProvider.updateMany({
      where: {
        isDefault: true
      },
      data: {
        isDefault: false
      }
    })

    // 设置新的默认 Provider
    return tx.aiProvider.update({
      where: { id },
      data: {
        isDefault: true
      }
    })
  })
}

/**
 * 取消默认 AI Provider
 */
export async function unsetDefaultAiProvider(id: bigint) {
  return prisma.aiProvider.update({
    where: { id },
    data: {
      isDefault: false
    }
  })
}

/**
 * 检查是否存在默认 Provider
 */
export async function hasDefaultProvider() {
  const count = await prisma.aiProvider.count({
    where: {
      isDefault: true
    }
  })
  return count > 0
}
