import OpenAI from 'openai'
import type { Message, AIConfig } from '@/types/chat'
import type { AIProvider } from './index'
import { logInfo, logError, logDebug, logWarn } from '../utils/logger'

/**
 * OpenAI Provider 实现
 */
export class OpenAIProvider implements AIProvider {
  /**
   * 验证 OpenAI 配置
   */
  validateConfig(config: AIConfig): boolean {
    if (config.provider !== 'openai') {
      logWarn('OpenAI provider validation failed: provider is not openai', {
        provider: config.provider
      })
      return false
    }
    if (!config.apiKey || !config.model) {
      logWarn('OpenAI provider validation failed: missing apiKey or model', {
        hasApiKey: !!config.apiKey,
        hasModel: !!config.model
      })
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
      logError('OpenAI streamChat failed: invalid configuration')
      callbacks.onError(new Error('Invalid OpenAI configuration'))
      return
    }

    logInfo('Starting OpenAI stream chat', {
      model: config.model,
      messages: messages,
      baseURL: config.baseURL || 'default',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens
    })

    try {
      // 创建 OpenAI 客户端
      logDebug('Creating OpenAI client', {
        baseURL: config.baseURL || 'default',
        hasOrganization: !!config.openai?.organization
      })
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
      logDebug('Creating stream request to OpenAI API')
      const stream = await client.chat.completions.create(
        {
          model: config.model,
          messages: openaiMessages,
          stream: true,
          temperature: config.temperature ?? 0.7,
          max_completion_tokens: config.maxTokens
        },
        {
          signal: abortSignal
        }
      )

      logDebug('Stream connection established, starting to process chunks')
      let chunkCount = 0

      // 处理流式响应
      for await (const chunk of stream) {
        // 检查是否已取消
        if (abortSignal?.aborted) {
          logInfo('OpenAI stream chat cancelled by user')
          return
        }

        const content = chunk.choices[0]?.delta?.content
        if (content) {
          chunkCount++
          callbacks.onChunk(content)
        }
      }

      logInfo('OpenAI stream chat completed successfully', {
        model: config.model,
        totalChunks: chunkCount
      })
      callbacks.onDone()
    } catch (error) {
      // 如果是取消错误，不调用 onError
      if (error instanceof Error && error.name === 'AbortError') {
        logInfo('OpenAI stream chat aborted')
        return
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      logError('OpenAI API error occurred', {
        model: config.model,
        error: errorMessage,
        errorName: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      })
      callbacks.onError(new Error(`OpenAI API error: ${errorMessage}`))
    }
  }
}
