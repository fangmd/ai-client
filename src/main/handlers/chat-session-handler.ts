import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import type { CreateChatSessionData, UpdateChatSessionData } from '@/types'
import {
  createChatSession,
  listChatSessions,
  getChatSessionById,
  updateChatSession,
  deleteChatSession
} from '@/main/repository/chat-session'
import { getAiProviderById } from '@/main/repository/ai-provider'
import { logError, logInfo } from '@/main/utils'

/**
 * ChatSession Handler
 * 处理对话会话相关的 IPC 请求
 */
export class ChatSessionHandler {
  /**
   * 注册所有 ChatSession 相关的 IPC 处理器
   */
  static register(): void {
    // 创建对话会话
    ipcMain.handle(
      IPC_CHANNELS.chatSession.create,
      async (_event, data: { title?: string; aiProviderId: string }) => {
        logInfo('【IPC Handler】chatSession:create called, params:', data)
        try {
          // 验证 aiProviderId 的有效性
          const aiProviderId = BigInt(data.aiProviderId)
          const provider = await getAiProviderById(aiProviderId)
          if (!provider) {
            const response = responseError('AI Provider not found')
            logError('【IPC Handler】chatSession:create error, response:', response)
            return response
          }

          const sessionData: CreateChatSessionData = {
            title: data.title,
            aiProviderId
          }

          const session = await createChatSession(sessionData)
          const response = responseSuccess(serializeChatSession(session))
          logInfo('【IPC Handler】chatSession:create success, response:', response)
          return response
        } catch (error) {
          const response = responseError(error)
          logError('【IPC Handler】chatSession:create error, response:', response)
          return response
        }
      }
    )

    // 查询对话列表
    ipcMain.handle(
      IPC_CHANNELS.chatSession.list,
      async (_event, options?: { limit?: number; offset?: number }) => {
        logInfo('【IPC Handler】chatSession:list called, params:', options)
        try {
          const sessions = await listChatSessions(options)
          const response = responseSuccess(sessions.map(serializeChatSession))
          logInfo('【IPC Handler】chatSession:list success, count:', sessions.length)
          return response
        } catch (error) {
          const response = responseError(error)
          logError('【IPC Handler】chatSession:list error, response:', response)
          return response
        }
      }
    )

    // 查询单个对话（包含消息）
    ipcMain.handle(IPC_CHANNELS.chatSession.get, async (_event, data: { id: string }) => {
      logInfo('【IPC Handler】chatSession:get called, params:', data)
      try {
        const id = BigInt(data.id)
        const session = await getChatSessionById(id)

        if (!session) {
          const response = responseError('Chat session not found')
          logError('【IPC Handler】chatSession:get error, response:', response)
          return response
        }

        const response = responseSuccess({
          ...serializeChatSession(session),
          messages: session.messages.map(serializeMessage)
        })
        logInfo('【IPC Handler】chatSession:get success, messagesCount:', session.messages.length)
        return response
      } catch (error) {
        const response = responseError(error)
        logError('【IPC Handler】chatSession:get error, response:', response)
        return response
      }
    })

    // 更新对话
    ipcMain.handle(
      IPC_CHANNELS.chatSession.update,
      async (_event, data: { id: string; data: UpdateChatSessionData }) => {
        logInfo('【IPC Handler】chatSession:update called, params:', data)
        try {
          const id = BigInt(data.id)
          const session = await updateChatSession(id, data.data)
          const response = responseSuccess(serializeChatSession(session))
          logInfo('【IPC Handler】chatSession:update success, response:', response)
          return response
        } catch (error) {
          const response = responseError(error)
          logError('【IPC Handler】chatSession:update error, response:', response)
          return response
        }
      }
    )

    // 删除对话
    ipcMain.handle(IPC_CHANNELS.chatSession.delete, async (_event, data: { id: string }) => {
      logInfo('【IPC Handler】chatSession:delete called, params:', data)
      try {
        const id = BigInt(data.id)
        await deleteChatSession(id)
        const response = responseSuccess()
        logInfo('【IPC Handler】chatSession:delete success, response:', response)
        return response
      } catch (error) {
        const response = responseError(error)
        logError('【IPC Handler】chatSession:delete error, response:', response)
        return response
      }
    })
  }

  /**
   * 注销所有 ChatSession 相关的 IPC 处理器
   */
  static unregister(): void {
    ipcMain.removeHandler(IPC_CHANNELS.chatSession.create)
    ipcMain.removeHandler(IPC_CHANNELS.chatSession.list)
    ipcMain.removeHandler(IPC_CHANNELS.chatSession.get)
    ipcMain.removeHandler(IPC_CHANNELS.chatSession.update)
    ipcMain.removeHandler(IPC_CHANNELS.chatSession.delete)
  }
}

/**
 * 序列化 ChatSession（将 BigInt 转换为 string）
 */
function serializeChatSession(session: {
  id: bigint
  title: string
  aiProviderId: bigint
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: session.id.toString(),
    title: session.title,
    aiProviderId: session.aiProviderId.toString(),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString()
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
