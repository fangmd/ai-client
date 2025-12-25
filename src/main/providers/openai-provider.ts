import OpenAI from 'openai'
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam
} from 'openai/resources/chat/completions'
import type { Message, AIConfig } from '@/types/chat-type'
import type { AIProvider, ToolType } from './index'
import { logInfo, logError, logDebug, logWarn } from '../utils/logger'
import {
  ResponseCreateParamsStreaming,
  ResponseTextDeltaEvent,
  ResponseContentPartAddedEvent
} from 'openai/resources/responses/responses.mjs'

/**
 * OpenAI Provider 实现
 */
export class OpenAIProvider implements AIProvider {
  /**
   * 判断是否使用 Responses API
   * 根据 model 字段判断：所有以 gpt 或 o1 开头的模型使用 Responses API
   */
  private shouldUseResponsesAPI(config: AIConfig): boolean {
    const model = config.model.toLowerCase()
    // OpenAI 官方模型：所有以 gpt 或 o1 开头的模型
    return model.startsWith('gpt') || model.startsWith('o1')
  }

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
    abortSignal?: AbortSignal,
    options?: {
      tools?: ToolType[]
    }
  ): Promise<void> {
    if (!this.validateConfig(config)) {
      logError('OpenAI streamChat failed: invalid configuration')
      callbacks.onError(new Error('Invalid OpenAI configuration'))
      return
    }

    // 根据 model 判断使用哪个 API
    const useResponsesAPI = this.shouldUseResponsesAPI(config)

    // 如果是 OpenAI 官方模型，默认启用 web_search
    // file_search 需要 vector_store_ids，需要用户明确提供配置才能使用
    // 同时支持上层传入的工具（会合并，去重）
    let tools: ToolType[] = []
    if (useResponsesAPI) {
      // 默认工具：只启用 web_search（file_search 需要 vector_store_ids，不能默认启用）
      const defaultTools: ToolType[] = ['web_search']
      // 上层传入的工具
      const userTools = options?.tools || []
      // 合并并去重
      tools = Array.from(new Set([...defaultTools, ...userTools]))
    } else {
      // 非官方模型，只使用上层传入的工具
      tools = options?.tools || []
    }

    logInfo('Starting OpenAI stream chat', {
      model: config.model,
      useResponsesAPI,
      tools,
      defaultToolsEnabled: useResponsesAPI,
      messages: messages,
      baseURL: config.baseURL || 'default',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens
    })

    try {
      if (useResponsesAPI) {
        await this.streamChatWithResponsesAPI(messages, config, callbacks, abortSignal, tools)
      } else {
        await this.streamChatWithCompletionsAPI(messages, config, callbacks, abortSignal)
      }
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

  /**
   * 使用 Chat Completions API 进行流式聊天
   */
  private async streamChatWithCompletionsAPI(
    messages: Omit<Message, 'id' | 'timestamp'>[],
    config: AIConfig,
    callbacks: {
      onChunk: (chunk: string) => void
      onDone: () => void
      onError: (error: Error) => void
    },
    abortSignal?: AbortSignal
  ): Promise<void> {
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

      logInfo('OpenAI Chat Completions stream chat completed successfully', {
        model: config.model,
        totalChunks: chunkCount
      })
      callbacks.onDone()
    } catch (error) {
      throw error // 重新抛出，由外层处理
    }
  }

  /**
   * 使用 Responses API 进行流式聊天
   */
  private async streamChatWithResponsesAPI(
    messages: Omit<Message, 'id' | 'timestamp'>[],
    config: AIConfig,
    callbacks: {
      onChunk: (chunk: string) => void
      onDone: () => void
      onError: (error: Error) => void
    },
    abortSignal?: AbortSignal,
    tools: ToolType[] = []
  ): Promise<void> {
    try {
      // 创建 OpenAI 客户端
      logDebug('Creating OpenAI client for Responses API', {
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

      // 构建工具列表 - OpenAI Responses API 的 tools 参数格式为对象数组
      // web_search: { type: "web_search" }
      // file_search: { type: "file_search", vector_store_ids: [...] } (需要 vector_store_ids)
      const toolsList = tools
        .map((tool) => {
          if (tool === 'web_search') {
            return { type: 'web_search' as const }
          }
          if (tool === 'file_search') {
            // file_search 需要 vector_store_ids，如果没有提供则跳过
            // TODO: 未来可以从 options 中获取 vector_store_ids 配置
            logWarn('file_search tool requires vector_store_ids, skipping', {
              tool
            })
            return null
          }
          return { type: tool }
        })
        .filter((tool): tool is NonNullable<typeof tool> => tool !== null)

      // 创建流式请求
      logDebug('Creating stream request to OpenAI Responses API', {
        model: config.model,
        toolsCount: toolsList.length,
        tools: toolsList
      })

      // 构建请求参数
      const requestParams = {
        model: config.model,
        input: openaiMessages,
        stream: true as const,
        ...(toolsList.length > 0 ? { tools: toolsList } : {}),
        ...(config.temperature !== undefined && config.temperature !== null
          ? { temperature: config.temperature }
          : {}),
        ...(config.maxTokens !== undefined && config.maxTokens !== null
          ? { max_output_tokens: config.maxTokens }
          : {})
      } as ResponseCreateParamsStreaming

      logDebug('Request parameters:', requestParams)

      // 使用 Responses API
      const stream = await client.responses.create(requestParams, {
        signal: abortSignal
      })

      logDebug('Responses API stream connection established, starting to process chunks')
      let chunkCount = 0

      // 处理流式响应
      for await (const chunk of stream) {
        // 检查是否已取消
        if (abortSignal?.aborted) {
          logInfo('OpenAI Responses API stream chat cancelled by user')
          return
        }

        // Responses API 使用不同的事件类型
        // 主要处理文本增量事件： ResponseTextDeltaEvent
        const chunkType = (chunk as any).type
        if (chunkType === 'response.output_text.delta') {
          const textDeltaEvent = chunk as ResponseTextDeltaEvent
          if (textDeltaEvent.delta) {
            chunkCount++
            callbacks.onChunk(textDeltaEvent.delta)
          }
        }
        // 处理内容部分添加事件：ResponseContentPartAddedEvent（用于完整文本块）
        // 作为处理非流失输出的内容
        else if (chunkType === 'response.content_part.added') {
          logDebug('OpenAI Responses API stream chat chunk received', {
            chunk: chunk
          })

          const contentPartEvent = chunk as ResponseContentPartAddedEvent
          const part = contentPartEvent.part
          if (part.type === 'output_text' && 'text' in part) {
            chunkCount++
            callbacks.onChunk(part.text)
          }
        }

        // response.completed

        // 处理工具调用结果（如果需要）
        // TODO: 处理 web_search 和 file_search 的结果
      }

      logInfo('OpenAI Responses API stream chat completed successfully', {
        model: config.model,
        totalChunks: chunkCount
      })
      callbacks.onDone()
    } catch (error) {
      throw error // 重新抛出，由外层处理
    }
  }
}
