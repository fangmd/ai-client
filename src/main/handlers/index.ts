import { AIProviderHandler } from './ai-provider-handler'
import { AIHandler } from './ai-handler'
import { ChatSessionHandler } from './chat-session-handler'
import { MessageHandler } from './message-handler'
import { ConfigHandler } from './config-handler'

/**
 * 统一注册所有 IPC Handlers
 */
export function registerHandlers(): void {
  AIProviderHandler.register()
  AIHandler.register()
  ChatSessionHandler.register()
  MessageHandler.register()
  ConfigHandler.register()
}

/**
 * 统一注销所有 IPC Handlers
 */
export function unregisterHandlers(): void {
  AIProviderHandler.unregister()
  AIHandler.unregister()
  ChatSessionHandler.unregister()
  MessageHandler.unregister()
  ConfigHandler.unregister()
}
