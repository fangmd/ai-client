import { prisma } from '@/main/common/db/prisma'
import { generateUUID } from '@/main/utils/snowflake'
import { deleteFile } from '@/main/utils/file-storage'
import type { DbAttachment, CreateAttachmentData } from '@/types'

/**
 * 创建附件
 */
export async function createAttachment(data: CreateAttachmentData): Promise<DbAttachment> {
  return prisma.attachment.create({
    data: {
      id: generateUUID().valueOf(),
      messageId: data.messageId,
      type: data.type,
      name: data.name,
      mimeType: data.mimeType,
      size: data.size,
      path: data.path
    }
  })
}

/**
 * 批量创建附件
 */
export async function createAttachments(attachments: CreateAttachmentData[]): Promise<DbAttachment[]> {
  const results: DbAttachment[] = []
  for (const data of attachments) {
    const attachment = await createAttachment(data)
    results.push(attachment)
  }
  return results
}

/**
 * 根据消息 ID 查询附件列表
 */
export async function listAttachmentsByMessageId(messageId: bigint): Promise<DbAttachment[]> {
  return prisma.attachment.findMany({
    where: { messageId },
    orderBy: { createdAt: 'asc' }
  })
}

/**
 * 根据多个消息 ID 批量查询附件
 */
export async function listAttachmentsByMessageIds(messageIds: bigint[]): Promise<Map<bigint, DbAttachment[]>> {
  const attachments = await prisma.attachment.findMany({
    where: { messageId: { in: messageIds } },
    orderBy: { createdAt: 'asc' }
  })

  const map = new Map<bigint, DbAttachment[]>()
  for (const attachment of attachments) {
    const list = map.get(attachment.messageId) || []
    list.push(attachment)
    map.set(attachment.messageId, list)
  }
  return map
}

/**
 * 删除消息的所有附件（包括文件）
 */
export async function deleteAttachmentsByMessageId(messageId: bigint): Promise<void> {
  // 查询附件记录
  const attachments = await prisma.attachment.findMany({
    where: { messageId }
  })

  // 删除文件
  for (const attachment of attachments) {
    deleteFile(attachment.path)
  }

  // 删除数据库记录
  await prisma.attachment.deleteMany({
    where: { messageId }
  })
}

/**
 * 根据 ID 查询附件
 */
export async function getAttachmentById(id: bigint): Promise<DbAttachment | null> {
  return prisma.attachment.findUnique({
    where: { id }
  })
}

