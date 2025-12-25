import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import type {
  Attachment,
  CreateMessageData,
  CreateMessageRequest,
  UpdateMessageRequest,
  AppendMessageRequest,
  ListMessagesRequest
} from '@/types'
import {
  createMessage,
  updateMessage,
  appendMessageContent,
  listMessages
} from '@/main/repository/message'
import {
  createAttachments,
  listAttachmentsByMessageIds
} from '@/main/repository/attachment'
import { chatSessionExists } from '@/main/repository/chat-session'
import { logDebug, logError, logInfo } from '@/main/utils'

/**
 * Message Handler
 * 处理消息相关的 IPC 请求
 */
export class MessageHandler {
  /**
   * 注册所有 Message 相关的 IPC 处理器
   */
  static register(): void {
    // 创建消息
    ipcMain.handle(
      IPC_CHANNELS.message.create,
      async (_event, data: CreateMessageRequest) => {
        logInfo('【IPC Handler】message:create called, params:', {
          sessionId: data.sessionId,
          role: data.role,
          contentLength: data.content.length,
          attachmentsCount: data.attachments?.length ?? 0,
          status: data.status,
          totalTokens: data.totalTokens
        })
        try {
          // 验证 sessionId 的有效性
          const exists = await chatSessionExists(data.sessionId)
          if (!exists) {
            const response = responseError('Chat session not found')
            logError('【IPC Handler】message:create error, response:', response)
            return response
          }

          const messageData: CreateMessageData = {
            sessionId: data.sessionId,
            role: data.role,
            content: data.content,
            status: data.status,
            totalTokens: data.totalTokens,
            contentType: data.contentType,
            toolType: data.toolCall?.type,
            toolStatus: data.toolCall?.status,
            toolItemId: data.toolCall?.itemId,
            toolOutputIndex: data.toolCall?.outputIndex,
            toolQuery: data.toolCall?.query
          }

          // 创建消息
          const message = await createMessage(messageData)

          // 如果有附件，创建附件记录
          let attachments: Attachment[] | undefined
          if (data.attachments && data.attachments.length > 0) {
            const attachmentData = data.attachments.map((a) => ({
              messageId: message.id,
              type: a.type,
              name: a.name,
              mimeType: a.mimeType,
              size: a.size,
              data: a.data
            }))
            const dbAttachments = await createAttachments(attachmentData)
            attachments = dbAttachments.map((a) => ({
              id: a.id,
              type: a.type as 'image' | 'file',
              name: a.name,
              mimeType: a.mimeType,
              size: a.size,
              data: a.data
            }))
          }

          // 返回消息和附件
          const responseData: any = {
            ...message,
            attachments
          }
          
          // 如果是工具调用消息，添加 toolCall 字段
          if (message.contentType === 'tool_call') {
            responseData.toolCall = {
              itemId: message.toolItemId,
              type: message.toolType,
              status: message.toolStatus,
              query: message.toolQuery,
              outputIndex: message.toolOutputIndex
            }
          }
          
          const response = responseSuccess(responseData)
          logInfo('【IPC Handler】message:create success, response:', response)
          return response
        } catch (error) {
          const response = responseError(error)
          logError('【IPC Handler】message:create error, response:', response)
          return response
        }
      }
    )

    // 更新消息
    ipcMain.handle(
      IPC_CHANNELS.message.update,
      async (_event, data: UpdateMessageRequest) => {
        logInfo('【IPC Handler】message:update called, params:', data)
        try {
          const message = await updateMessage(data.id, data.data)
          const response = responseSuccess(message)
          logInfo('【IPC Handler】message:update success, response:', response)
          return response
        } catch (error) {
          const response = responseError(error)
          logError('【IPC Handler】message:update error, response:', response)
          return response
        }
      }
    )

    // 追加消息内容（用于流式响应）
    ipcMain.handle(
      IPC_CHANNELS.message.append,
      async (_event, data: AppendMessageRequest) => {
        logInfo('【IPC Handler】message:append called, params:', {
          id: data.id,
          contentLength: data.content.length
        })
        try {
          const message = await appendMessageContent(data.id, data.content)
          const response = responseSuccess(message)
          logInfo('【IPC Handler】message:append success, response:', response)
          return response
        } catch (error) {
          const response = responseError(error)
          logError('【IPC Handler】message:append error, response:', response)
          return response
        }
      }
    )

    // 查询会话的所有消息
    ipcMain.handle(IPC_CHANNELS.message.list, async (_event, data: ListMessagesRequest) => {
      logInfo('【IPC Handler】message:list called, params:', data)
      try {
        const messages = await listMessages(data.sessionId)

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
          
          const result: any = {
            ...msg,
            attachments
          }
          
          // 如果是工具调用消息，添加 toolCall 字段
          if (msg.contentType === 'tool_call') {
            result.toolCall = {
              itemId: msg.toolItemId,
              type: msg.toolType,
              status: msg.toolStatus,
              query: msg.toolQuery,
              outputIndex: msg.toolOutputIndex
            }
          }
          
          return result
        })

        const response = responseSuccess(messagesWithAttachments)
        logInfo('【IPC Handler】message:list success, count:', messages.length)
        logDebug('【IPC Handler】message:list success, messages:', response)
        return response
      } catch (error) {
        const response = responseError(error)
        logError('【IPC Handler】message:list error, response:', response)
        return response
      }
    })
  }

  /**
   * 注销所有 Message 相关的 IPC 处理器
   */
  static unregister(): void {
    ipcMain.removeHandler(IPC_CHANNELS.message.create)
    ipcMain.removeHandler(IPC_CHANNELS.message.update)
    ipcMain.removeHandler(IPC_CHANNELS.message.append)
    ipcMain.removeHandler(IPC_CHANNELS.message.list)
  }
}
