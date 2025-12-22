import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../common/constants'
import type { IPCResponse } from '../../preload/types'

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
        const response: IPCResponse<{ message: string }> = {
          code: 0,
          data: { message: 'pong' },
          msg: 'success'
        }
        event.reply(IPC_CHANNELS.test.pong, response)
      } catch (error) {
        const response: IPCResponse = {
          code: -1,
          msg: error instanceof Error ? error.message : 'Unknown error'
        }
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
