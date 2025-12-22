import { prisma } from '@/main/common/db/prisma'
import type { Prisma } from '@prisma/client'

/**
 * AI Provider 创建数据
 */
export type CreateAiProviderData = Prisma.AiProviderCreateInput

/**
 * AI Provider 更新数据
 */
export type UpdateAiProviderData = Prisma.AiProviderUpdateInput

/**
 * 创建 AI Provider
 */
export async function createAiProvider(data: CreateAiProviderData) {
  return prisma.aiProvider.create({
    data,
  })
}

/**
 * 查询所有 AI Provider
 */
export async function getAllAiProviders() {
  return prisma.aiProvider.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * 根据 ID 查询 AI Provider
 */
export async function getAiProviderById(id: string) {
  return prisma.aiProvider.findUnique({
    where: { id },
  })
}

/**
 * 查询默认 AI Provider
 */
export async function getDefaultAiProvider() {
  return prisma.aiProvider.findFirst({
    where: {
      isDefault: true,
    },
  })
}

/**
 * 根据提供商类型查询 AI Provider
 */
export async function getAiProvidersByType(provider: string) {
  return prisma.aiProvider.findMany({
    where: {
      provider,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * 更新 AI Provider
 */
export async function updateAiProvider(id: string, data: UpdateAiProviderData) {
  return prisma.aiProvider.update({
    where: { id },
    data,
  })
}

/**
 * 删除 AI Provider
 */
export async function deleteAiProvider(id: string) {
  return prisma.aiProvider.delete({
    where: { id },
  })
}

/**
 * 设置默认 AI Provider
 * 会自动取消其他 Provider 的默认状态
 */
export async function setDefaultAiProvider(id: string) {
  // 使用事务确保数据一致性
  return prisma.$transaction(async (tx) => {
    // 先取消所有默认状态
    await tx.aiProvider.updateMany({
      where: {
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    })

    // 设置新的默认 Provider
    return tx.aiProvider.update({
      where: { id },
      data: {
        isDefault: true,
      },
    })
  })
}

/**
 * 取消默认 AI Provider
 */
export async function unsetDefaultAiProvider(id: string) {
  return prisma.aiProvider.update({
    where: { id },
    data: {
      isDefault: false,
    },
  })
}

/**
 * 检查是否存在默认 Provider
 */
export async function hasDefaultProvider() {
  const count = await prisma.aiProvider.count({
    where: {
      isDefault: true,
    },
  })
  return count > 0
}
