import { TestHandler } from './test-handler'
import { AIHandler } from './ai-handler'

/**
 * 统一注册所有 IPC Handlers
 */
export function registerHandlers(): void {
  TestHandler.register()
  AIHandler.register()
}

/**
 * 统一注销所有 IPC Handlers
 */
export function unregisterHandlers(): void {
  TestHandler.unregister()
  AIHandler.unregister()
}
