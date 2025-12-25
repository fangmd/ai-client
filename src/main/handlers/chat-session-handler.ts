import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import type {
  CreateChatSessionData,
  CreateChatSessionRequest,
  ListChatSessionsRequest,
  GetChatSessionRequest,
  UpdateChatSessionRequest,
  DeleteChatSessionRequest
} from '@/types'
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
      async (_event, data: CreateChatSessionRequest) => {
        logInfo('【IPC Handler】chatSession:create called, params:', data)
        try {
          // 验证 aiProviderId 的有效性
          const provider = await getAiProviderById(data.aiProviderId)
          if (!provider) {
            const response = responseError('AI Provider not found')
            logError('【IPC Handler】chatSession:create error, response:', response)
            return response
          }

          const sessionData: CreateChatSessionData = {
            title: data.title,
            aiProviderId: data.aiProviderId
          }

          const session = await createChatSession(sessionData)
          const response = responseSuccess(session)
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
      async (_event, options?: ListChatSessionsRequest) => {
        logInfo('【IPC Handler】chatSession:list called, params:', options)
        try {
          const sessions = await listChatSessions(options)
          const response = responseSuccess(sessions)
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
    ipcMain.handle(IPC_CHANNELS.chatSession.get, async (_event, data: GetChatSessionRequest) => {
      logInfo('【IPC Handler】chatSession:get called, params:', data)
      try {
        const session = await getChatSessionById(data.id)

        if (!session) {
          const response = responseError('Chat session not found')
          logError('【IPC Handler】chatSession:get error, response:', response)
          return response
        }

        const response = responseSuccess(session)
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
      async (_event, data: UpdateChatSessionRequest) => {
        logInfo('【IPC Handler】chatSession:update called, params:', data)
        try {
          const session = await updateChatSession(data.id, data.data)
          const response = responseSuccess(session)
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
    ipcMain.handle(IPC_CHANNELS.chatSession.delete, async (_event, data: DeleteChatSessionRequest) => {
      logInfo('【IPC Handler】chatSession:delete called, params:', data)
      try {
        await deleteChatSession(data.id)
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
