import { prisma } from '@/main/common/db/prisma'
import { generateUUID } from '@/main/utils/snowflake'
import type { DbMessage, CreateMessageData, UpdateMessageData } from '@/types'

/**
 * 创建消息
 * 使用事务确保数据一致性，减少数据库操作次数
 */
export async function createMessage(data: CreateMessageData): Promise<DbMessage> {
  return prisma.$transaction(async (tx) => {
    // 如果是用户消息，先检查是否是第一条（在事务内检查）
    let isFirstUser = false
    if (data.role === 'user') {
      const userMsgCount = await tx.message.count({
        where: { sessionId: data.sessionId, role: 'user' }
      })
      isFirstUser = userMsgCount === 0
    }

    // 创建消息
    const message = await tx.message.create({
      data: {
        id: generateUUID().valueOf(),
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        status: data.status ?? 'sent',
        totalTokens: data.totalTokens
      }
    })

    // 准备会话更新数据：始终更新 updatedAt，可能更新 title
    const sessionUpdate: { updatedAt: Date; title?: string } = {
      updatedAt: new Date()
    }

    // 如果是第一条用户消息，同时更新标题
    if (isFirstUser) {
      sessionUpdate.title = generateTitleFromContent(data.content)
    }

    // 单次更新会话（合并 updatedAt 和 title 更新）
    await tx.chatSession.update({
      where: { id: data.sessionId },
      data: sessionUpdate
    })

    return message
  })
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
 * 使用原生 SQL 进行字符串拼接，避免先查询再更新的两次往返
 */
export async function appendMessageContent(id: bigint, content: string): Promise<DbMessage> {
  // 使用原生 SQL 直接拼接字符串，更高效
  const affected = await prisma.$executeRaw`
    UPDATE message SET content = content || ${content} WHERE id = ${id}
  `

  if (affected === 0) {
    throw new Error(`Message not found: ${id}`)
  }

  // 查询并返回更新后的消息
  const message = await prisma.message.findUnique({
    where: { id }
  })

  if (!message) {
    throw new Error(`Message not found: ${id}`)
  }

  return message
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
