import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import type { CreateMessageData, UpdateMessageData, MessageRole, DbMessageStatus } from '@/types'
import {
  createMessage,
  updateMessage,
  appendMessageContent,
  listMessages
} from '@/main/repository/message'
import { chatSessionExists } from '@/main/repository/chat-session'
import { logError, logInfo } from '@/main/utils'

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
      async (
        _event,
        data: {
          sessionId: bigint
          role: MessageRole
          content: string
          status?: DbMessageStatus
          totalTokens?: number
        }
      ) => {
        logInfo('【IPC Handler】message:create called, params:', {
          sessionId: data.sessionId,
          role: data.role,
          contentLength: data.content.length,
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
            totalTokens: data.totalTokens
          }

          const message = await createMessage(messageData)
          const response = responseSuccess(message)
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
      async (_event, data: { id: bigint; data: UpdateMessageData }) => {
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
      async (_event, data: { id: bigint; content: string }) => {
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
    ipcMain.handle(IPC_CHANNELS.message.list, async (_event, data: { sessionId: bigint }) => {
      logInfo('【IPC Handler】message:list called, params:', data)
      try {
        const messages = await listMessages(data.sessionId)
        const response = responseSuccess(messages)
        logInfo('【IPC Handler】message:list success, count:', messages.length)
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
