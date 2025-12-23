import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../common/constants'
import { responseSuccess, responseError } from '../../common/response'
import type { CreateMessageData, UpdateMessageData, MessageRole, DbMessageStatus } from '@/types'
import {
  createMessage,
  updateMessage,
  appendMessageContent,
  listMessages
} from '../repository/message'
import { chatSessionExists } from '../repository/chat-session'
import { logError, logInfo } from '../utils'

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
          sessionId: string
          role: MessageRole
          content: string
          status?: DbMessageStatus
          totalTokens?: number
        }
      ) => {
        try {
          // 验证 sessionId 的有效性
          const sessionId = BigInt(data.sessionId)
          const exists = await chatSessionExists(sessionId)
          if (!exists) {
            return responseError('Chat session not found')
          }

          const messageData: CreateMessageData = {
            sessionId,
            role: data.role,
            content: data.content,
            status: data.status,
            totalTokens: data.totalTokens
          }

          const message = await createMessage(messageData)
          logInfo('【IPC Handler】message:create success')
          return responseSuccess(serializeMessage(message))
        } catch (error) {
          logError('【IPC Handler】message:create error:', error)
          return responseError(error)
        }
      }
    )

    // 更新消息
    ipcMain.handle(
      IPC_CHANNELS.message.update,
      async (_event, data: { id: string; data: UpdateMessageData }) => {
        try {
          const id = BigInt(data.id)
          const message = await updateMessage(id, data.data)
          return responseSuccess(serializeMessage(message))
        } catch (error) {
          logError('【IPC Handler】message:update error:', error)
          return responseError(error)
        }
      }
    )

    // 追加消息内容（用于流式响应）
    ipcMain.handle(
      IPC_CHANNELS.message.append,
      async (_event, data: { id: string; content: string }) => {
        try {
          const id = BigInt(data.id)
          const message = await appendMessageContent(id, data.content)
          return responseSuccess(serializeMessage(message))
        } catch (error) {
          logError('【IPC Handler】message:append error:', error)
          return responseError(error)
        }
      }
    )

    // 查询会话的所有消息
    ipcMain.handle(IPC_CHANNELS.message.list, async (_event, data: { sessionId: string }) => {
      try {
        const sessionId = BigInt(data.sessionId)
        const messages = await listMessages(sessionId)
        return responseSuccess(messages.map(serializeMessage))
      } catch (error) {
        logError('【IPC Handler】message:list error:', error)
        return responseError(error)
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

/**
 * 序列化 Message（将 BigInt 转换为 string）
 */
function serializeMessage(message: {
  id: bigint
  sessionId: bigint
  role: string
  content: string
  status: string | null
  totalTokens: number | null
  createdAt: Date
}) {
  return {
    id: message.id.toString(),
    sessionId: message.sessionId.toString(),
    role: message.role,
    content: message.content,
    status: message.status,
    totalTokens: message.totalTokens,
    createdAt: message.createdAt.toISOString()
  }
}
