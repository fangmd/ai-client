import { prisma } from '@/main/common/db/prisma'
import { generateUUID } from '@/main/utils/snowflake'
import { listMessages } from './message'
import { listAttachmentsByMessageIds } from './attachment'
import type { Attachment, DbChatSession, CreateChatSessionData, UpdateChatSessionData } from '@/types'

/**
 * 创建对话会话
 */
export async function createChatSession(data: CreateChatSessionData): Promise<DbChatSession> {
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
}): Promise<DbChatSession[]> {
  return prisma.chatSession.findMany({
    take: options?.limit ?? 100,
    skip: options?.offset ?? 0,
    orderBy: {
      updatedAt: 'desc'
    }
  })
}

/**
 * 根据 ID 查询对话会话（包含消息和附件）
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

  // 批量查询所有消息的附件
  const messageIds = messages.map((m) => m.id)
  const attachmentsMap = await listAttachmentsByMessageIds(messageIds)

  // 合并消息和附件
  const messagesWithAttachments = messages.map((msg) => {
    const dbAttachments = attachmentsMap.get(msg.id) || []
    const attachments: Attachment[] | undefined =
      dbAttachments.length > 0
        ? dbAttachments.map((a) => ({
            id: a.id,
            type: a.type as 'image' | 'file',
            name: a.name,
            mimeType: a.mimeType,
            size: a.size,
            data: a.data
          }))
        : undefined
    return {
      ...msg,
      attachments
    }
  })

  return {
    ...session,
    messages: messagesWithAttachments
  }
}

/**
 * 更新对话会话
 */
export async function updateChatSession(
  id: bigint,
  data: UpdateChatSessionData
): Promise<DbChatSession> {
  return prisma.chatSession.update({
    where: { id },
    data: {
      title: data.title,
      aiProviderId: data.aiProviderId
    }
  })
}

/**
 * 删除对话会话（应用层级联删除消息和附件）
 * 注意：由于使用逻辑外键，需要在应用层手动删除关联的数据
 * 实现方式：先删除附件，再删除消息，最后删除会话（使用事务确保原子性）
 */
export async function deleteChatSession(id: bigint): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 查询会话的所有消息 ID
    const messages = await tx.message.findMany({
      where: { sessionId: id },
      select: { id: true }
    })
    const messageIds = messages.map((m) => m.id)

    // 先删除所有关联的附件
    if (messageIds.length > 0) {
      await tx.attachment.deleteMany({
        where: { messageId: { in: messageIds } }
      })
    }

    // 再删除所有关联的消息
    await tx.message.deleteMany({
      where: { sessionId: id }
    })

    // 最后删除会话
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

