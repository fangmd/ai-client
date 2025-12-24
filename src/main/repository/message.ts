import { prisma } from '@/main/common/db/prisma'
import { generateUUID } from '@/main/utils/snowflake'
import type { DbMessage, CreateMessageData, UpdateMessageData } from '@/types'

/**
 * 创建消息
 */
export async function createMessage(data: CreateMessageData): Promise<DbMessage> {
  // 创建消息
  const message = await prisma.message.create({
    data: {
      id: generateUUID().valueOf(),
      sessionId: data.sessionId,
      role: data.role,
      content: data.content,
      status: data.status ?? 'sent',
      totalTokens: data.totalTokens
    }
  })

  // 更新会话的 updatedAt
  await prisma.chatSession.update({
    where: { id: data.sessionId },
    data: {
      updatedAt: new Date()
    }
  })

  // 检查是否为会话的第一条用户消息，如果是则自动生成标题
  if (data.role === 'user') {
    const isFirst = await isFirstUserMessage(data.sessionId)
    if (isFirst) {
      const title = generateTitleFromContent(data.content)
      await prisma.chatSession.update({
        where: { id: data.sessionId },
        data: { title }
      })
    }
  }

  return message
}

/**
 * 更新消息
 */
export async function updateMessage(id: bigint, data: UpdateMessageData): Promise<DbMessage> {
  return prisma.message.update({
    where: { id },
    data: {
      content: data.content,
      status: data.status,
      totalTokens: data.totalTokens
    }
  })
}

/**
 * 追加消息内容（用于流式响应）
 */
export async function appendMessageContent(id: bigint, content: string): Promise<DbMessage> {
  const message = await prisma.message.findUnique({
    where: { id }
  })

  if (!message) {
    throw new Error(`Message not found: ${id}`)
  }

  return prisma.message.update({
    where: { id },
    data: {
      content: message.content + content
    }
  })
}

/**
 * 查询会话的所有消息
 */
export async function listMessages(sessionId: bigint): Promise<DbMessage[]> {
  return prisma.message.findMany({
    where: { sessionId },
    orderBy: {
      createdAt: 'asc'
    }
  })
}

/**
 * 删除会话的所有消息（用于级联删除）
 */
export async function deleteMessagesBySessionId(sessionId: bigint): Promise<void> {
  await prisma.message.deleteMany({
    where: { sessionId }
  })
}

/**
 * 检查是否为会话的第一条用户消息
 */
export async function isFirstUserMessage(sessionId: bigint): Promise<boolean> {
  const count = await prisma.message.count({
    where: {
      sessionId,
      role: 'user'
    }
  })
  // 如果只有一条用户消息（刚创建的那条），则是第一条
  return count === 1
}

/**
 * 根据消息内容生成标题
 */
function generateTitleFromContent(content: string): string {
  // 去除首尾空格和换行
  const trimmed = content.trim().replace(/\n+/g, ' ')

  // 如果为空，使用默认标题
  if (!trimmed) {
    return 'New Chat'
  }

  // 提取前 30 个字符
  if (trimmed.length <= 30) {
    return trimmed
  }

  return trimmed.slice(0, 30) + '...'
}

/**
 * 根据 ID 查询消息
 */
export async function getMessageById(id: bigint): Promise<DbMessage | null> {
  return prisma.message.findUnique({
    where: { id }
  })
}
