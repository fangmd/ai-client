/**
 * Prisma Client 使用示例
 * 此文件仅作为参考，展示如何使用 Prisma Client 操作 ai_provider 表
 */

import { prisma } from '@/main/common/db/prisma'

/**
 * 示例：创建 AI Provider
 */
export async function createAiProviderExample() {
  const provider = await prisma.aiProvider.create({
    data: {
      name: 'OpenAI Default',
      provider: 'openai',
      apiKey: 'your-api-key-here',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      isDefault: true,
    },
  })
  return provider
}

/**
 * 示例：查询所有 AI Provider
 */
export async function getAllAiProvidersExample() {
  const providers = await prisma.aiProvider.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })
  return providers
}

/**
 * 示例：查询默认 Provider
 */
export async function getDefaultProviderExample() {
  const provider = await prisma.aiProvider.findFirst({
    where: {
      isDefault: true,
    },
  })
  return provider
}

/**
 * 示例：更新 AI Provider
 */
export async function updateAiProviderExample(id: string, data: Partial<typeof prisma.aiProvider>) {
  const provider = await prisma.aiProvider.update({
    where: { id },
    data,
  })
  return provider
}

/**
 * 示例：删除 AI Provider
 */
export async function deleteAiProviderExample(id: string) {
  await prisma.aiProvider.delete({
    where: { id },
  })
}
