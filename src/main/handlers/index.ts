import { TestHandler } from './test-handler'

/**
 * 统一注册所有 IPC Handlers
 */
export function registerHandlers(): void {
  TestHandler.register()
}

/**
 * 统一注销所有 IPC Handlers
 */
export function unregisterHandlers(): void {
  TestHandler.unregister()
}
