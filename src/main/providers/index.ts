import type { Message, AIConfig } from '@/types/chat'
import { OpenAIProvider } from './openai-provider'

/**
 * AI Provider 接口
 * 所有 AI 提供商必须实现此接口
 */
export interface AIProvider {
  /**
   * 流式聊天
   * @param messages 消息列表
   * @param config AI 配置
   * @param callbacks 回调函数
   * @param abortSignal 取消信号
   */
  streamChat(
    messages: Omit<Message, 'id' | 'timestamp'>[],
    config: AIConfig,
    callbacks: {
      onChunk: (chunk: string) => void
      onDone: () => void
      onError: (error: Error) => void
    },
    abortSignal?: AbortSignal
  ): Promise<void>

  /**
   * 验证配置
   * @param config AI 配置
   */
  validateConfig(config: AIConfig): boolean
}

/**
 * AI Provider 工厂
 * 根据配置创建对应的 Provider 实例
 */
export class AIProviderFactory {
  /**
   * 创建 Provider 实例
   * @param providerType 提供商类型
   */
  static create(providerType: AIConfig['provider']): AIProvider {
    switch (providerType) {
      case 'openai':
        return new OpenAIProvider()
      case 'anthropic':
        throw new Error('Anthropic provider not implemented yet')
      case 'custom':
        throw new Error('Custom provider not implemented yet')
      default:
        throw new Error(`Unknown provider type: ${providerType}`)
    }
  }
}
