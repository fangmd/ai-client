import { prisma } from '@/main/common/db/prisma'
import { generateUUID } from '@/common/snowflake'
import { listMessages } from './message'

/**
 * ChatSession 类型
 */
export type ChatSession = {
  id: bigint
  title: string
  aiProviderId: bigint
  createdAt: Date
  updatedAt: Date
}

/**
 * ChatSession 创建数据
 */
export type CreateChatSessionData = {
  title?: string
  aiProviderId: bigint
}

/**
 * ChatSession 更新数据
 */
export type UpdateChatSessionData = {
  title?: string
}

/**
 * 创建对话会话
 */
export async function createChatSession(data: CreateChatSessionData): Promise<ChatSession> {
  return prisma.chatSession.create({
    data: {
      id: generateUUID().valueOf(),
      title: data.title || 'New Chat',
      aiProviderId: data.aiProviderId
    }
  })
}

/**
 * 查询所有对话会话
 */
export async function listChatSessions(options?: {
  limit?: number
  offset?: number
}): Promise<ChatSession[]> {
  return prisma.chatSession.findMany({
    take: options?.limit ?? 100,
    skip: options?.offset ?? 0,
    orderBy: {
      updatedAt: 'desc'
    }
  })
}

/**
 * 根据 ID 查询对话会话（包含消息）
 */
export async function getChatSessionById(id: bigint) {
  const session = await prisma.chatSession.findUnique({
    where: { id }
  })

  if (!session) {
    return null
  }

  // 手动查询关联的消息（逻辑外键）
  const messages = await listMessages(id)

  return {
    ...session,
    messages
  }
}

/**
 * 更新对话会话
 * 注意：aiProviderId 创建后不可修改，如需更换 Provider 应创建新会话
 */
export async function updateChatSession(
  id: bigint,
  data: UpdateChatSessionData
): Promise<ChatSession> {
  return prisma.chatSession.update({
    where: { id },
    data: {
      title: data.title
    }
  })
}

/**
 * 删除对话会话（应用层级联删除消息）
 * 注意：由于使用逻辑外键，需要在应用层手动删除关联的消息
 * 实现方式：先删除所有关联的消息，再删除会话（使用事务确保原子性）
 */
export async function deleteChatSession(id: bigint): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 先删除所有关联的消息
    await tx.message.deleteMany({
      where: { sessionId: id }
    })
    // 再删除会话
    await tx.chatSession.delete({
      where: { id }
    })
  })
}

/**
 * 检查对话会话是否存在
 */
export async function chatSessionExists(id: bigint): Promise<boolean> {
  const count = await prisma.chatSession.count({
    where: { id }
  })
  return count > 0
}

