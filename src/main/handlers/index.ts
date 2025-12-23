import { TestHandler } from './test-handler'
import { AIProviderHandler } from './ai-provider-handler'
import { AIHandler } from './ai-handler'
import { ChatSessionHandler } from './chat-session-handler'
import { MessageHandler } from './message-handler'

/**
 * 统一注册所有 IPC Handlers
 */
export function registerHandlers(): void {
  TestHandler.register()
  AIProviderHandler.register()
  AIHandler.register()
  ChatSessionHandler.register()
  MessageHandler.register()
}

/**
 * 统一注销所有 IPC Handlers
 */
export function unregisterHandlers(): void {
  TestHandler.unregister()
  AIProviderHandler.unregister()
  AIHandler.unregister()
  ChatSessionHandler.unregister()
  MessageHandler.unregister()
}
