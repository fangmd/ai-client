import { prisma } from '@/main/common/db/prisma'
import { generateUUID } from '@/common/snowflake'

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 消息状态类型
 */
export type MessageStatus = 'sent' | 'pending' | 'error'

/**
 * Message 类型
 */
export type Message = {
  id: bigint
  sessionId: bigint
  role: string
  content: string
  status: string | null
  totalTokens: number | null
  createdAt: Date
}

/**
 * Message 创建数据
 */
export type CreateMessageData = {
  sessionId: bigint
  role: MessageRole
  content: string
  status?: MessageStatus
  totalTokens?: number
}

/**
 * Message 更新数据
 */
export type UpdateMessageData = {
  content?: string
  status?: MessageStatus
  totalTokens?: number
}

/**
 * 创建消息
 */
export async function createMessage(data: CreateMessageData): Promise<Message> {
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
export async function updateMessage(id: bigint, data: UpdateMessageData): Promise<Message> {
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
export async function appendMessageContent(id: bigint, content: string): Promise<Message> {
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
export async function listMessages(sessionId: bigint): Promise<Message[]> {
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
export async function getMessageById(id: bigint): Promise<Message | null> {
  return prisma.message.findUnique({
    where: { id }
  })
}
