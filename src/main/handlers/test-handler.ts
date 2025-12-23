import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@/common/constants'
import { responseSuccess, responseError } from '@/common/response'
import { logInfo, logError } from '@/main/utils'

/**
 * Test Handler
 * 处理测试相关的 IPC 请求
 */
export class TestHandler {
  /**
   * 注册所有 test 相关的 IPC 处理器
   */
  static register(): void {
    // ping 请求处理
    ipcMain.on(IPC_CHANNELS.test.ping, (event) => {
      logInfo('【IPC Handler】test:ping called')
      try {
        const response = responseSuccess({ message: 'pong' })
        logInfo('【IPC Handler】test:ping success, response:', response)
        event.reply(IPC_CHANNELS.test.pong, response)
      } catch (error) {
        const response = responseError(error)
        logError('【IPC Handler】test:ping error, response:', response)
        event.reply(IPC_CHANNELS.test.pong, response)
      }
    })
  }

  /**
   * 注销所有 test 相关的 IPC 处理器
   */
  static unregister(): void {
    ipcMain.removeAllListeners(IPC_CHANNELS.test.ping)
  }
}
