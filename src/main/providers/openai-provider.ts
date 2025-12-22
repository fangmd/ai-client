import OpenAI from 'openai'
import type { Message, AIConfig } from '@/types/chat'
import type { AIProvider } from './index'

/**
 * OpenAI Provider 实现
 */
export class OpenAIProvider implements AIProvider {
  /**
   * 验证 OpenAI 配置
   */
  validateConfig(config: AIConfig): boolean {
    if (config.provider !== 'openai') {
      return false
    }
    if (!config.apiKey || !config.model) {
      return false
    }
    return true
  }

  /**
   * 流式聊天实现
   */
  async streamChat(
    messages: Omit<Message, 'id' | 'timestamp'>[],
    config: AIConfig,
    callbacks: {
      onChunk: (chunk: string) => void
      onDone: () => void
      onError: (error: Error) => void
    },
    abortSignal?: AbortSignal
  ): Promise<void> {
    if (!this.validateConfig(config)) {
      callbacks.onError(new Error('Invalid OpenAI configuration'))
      return
    }

    try {
      // 创建 OpenAI 客户端
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        organization: config.openai?.organization
      })

      // 转换消息格式
      const openaiMessages = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }))

      // 创建流式请求
      const stream = await client.chat.completions.create(
        {
          model: config.model,
          messages: openaiMessages,
          stream: true,
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens
        },
        {
          signal: abortSignal
        }
      )

      // 处理流式响应
      for await (const chunk of stream) {
        // 检查是否已取消
        if (abortSignal?.aborted) {
          return
        }

        const content = chunk.choices[0]?.delta?.content
        if (content) {
          callbacks.onChunk(content)
        }
      }

      callbacks.onDone()
    } catch (error) {
      // 如果是取消错误，不调用 onError
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      callbacks.onError(new Error(`OpenAI API error: ${errorMessage}`))
    }
  }
}
