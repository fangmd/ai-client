import OpenAI from 'openai'
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam
} from 'openai/resources/chat/completions'
import type { Message, AIConfig } from '@/types/chat-type'
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

      // 转换消息格式（支持 Vision API）
      const openaiMessages: ChatCompletionMessageParam[] = messages.map((msg) => {
        const hasImageAttachments = msg.attachments?.some((a) => a.type === 'image')

        // 有图片附件时，使用 Vision 格式（只有 user 角色支持多模态内容）
        if (hasImageAttachments && msg.role === 'user') {
          const content: ChatCompletionContentPart[] = []

          // 添加文本内容
          if (msg.content) {
            content.push({ type: 'text', text: msg.content })
          }

          // 添加图片
          msg.attachments
            ?.filter((a) => a.type === 'image')
            .forEach((a) => {
              content.push({
                type: 'image_url',
                image_url: {
                  url: `data:${a.mimeType};base64,${a.data}`,
                  detail: 'auto'
                }
              })
            })

          return {
            role: 'user' as const,
            content
          }
        }

        // 无附件或非 user 角色，使用普通格式
        return {
          role: msg.role,
          content: msg.content
        } as ChatCompletionMessageParam
      })

      // 创建流式请求
      logDebug('Creating stream request to OpenAI API')
      
      // 构建请求参数（只传递明确设置的参数，避免某些模型不支持的参数）
      const requestParams = {
        model: config.model,
        messages: openaiMessages,
        stream: true as const,
        ...(config.temperature !== undefined && config.temperature !== null
          ? { temperature: config.temperature }
          : {}),
        ...(config.maxTokens !== undefined && config.maxTokens !== null
          ? { max_completion_tokens: config.maxTokens }
          : {})
      }

      const stream = await client.chat.completions.create(requestParams, {
        signal: abortSignal
      })

      logDebug('Stream connection established, starting to process chunks')
      let chunkCount = 0

      // 处理流式响应
      for await (const chunk of stream) {
        // 检查是否已取消
        if (abortSignal?.aborted) {
          logInfo('OpenAI stream chat cancelled by user')
          return
        }

        // logDebug('OpenAI stream chat chunk received', {
        //   chunk: chunk
        // })

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

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
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
