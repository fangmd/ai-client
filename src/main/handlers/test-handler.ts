import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../common/constants'
import { responseSuccess, responseError } from '../../common/response'

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
      try {
        console.log('pong')
        event.reply(IPC_CHANNELS.test.pong, responseSuccess({ message: 'pong' }))
      } catch (error) {
        event.reply(IPC_CHANNELS.test.pong, responseError(error))
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
