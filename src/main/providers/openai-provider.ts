import OpenAI from 'openai'
import type { AIMessageInput, AIConfig, ToolCallInfo } from '@/types'
import type { AIProvider, ToolType, StreamCallbacks } from './index'
import { logInfo, logError, logDebug, logWarn } from '../utils/logger'
import { fileToBase64 } from '../utils/file-storage'
import {
  ResponseCreateParamsStreaming,
  ResponseTextDeltaEvent,
  ResponseContentPartAddedEvent
} from 'openai/resources/responses/responses.mjs'
import { terminalToolDefinition } from './tools/terminal-tool'
import { executeTerminalCommand } from '../utils/tool-executor'
import { readToolDefinition } from './tools/read-tool'
import { readFile } from '../utils/file-reader'
import { McpClient } from './mcp/client'
import { getMcpToolConfigs } from './tools/mcp-config'

// MCP 客户端单例
let mcpClient: McpClient | null = null

/**
 * 初始化 MCP 客户端（在应用启动时调用）
 */
export async function initializeMcpClient(): Promise<void> {
  if (getMcpToolConfigs().length === 0) {
    logInfo('No MCP servers configured, skipping MCP client initialization')
    return
  }
  
  try {
    logInfo('Initializing MCP client...')
    mcpClient = new McpClient()
    await mcpClient.initialize()
    logInfo('MCP client initialized successfully')
  } catch (error) {
    logError('Failed to initialize MCP client', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

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
    messages: AIMessageInput[],
    config: AIConfig,
    callbacks: StreamCallbacks,
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
      await this.streamChatWithResponsesAPI(
        messages,
        config,
        callbacks,
        abortSignal,
        tools,
        options
      )
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
   * 使用 Responses API 进行流式聊天
   */
  private async streamChatWithResponsesAPI(
    messages: AIMessageInput[],
    config: AIConfig,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal,
    tools: ToolType[] = [],
    options?: {
      tools?: ToolType[]
    }
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

      // 转换消息格式（支持 Vision API 和 Function Calling）
      // Responses API 的 input 可以是字符串或 ResponseInputItem 数组
      // 需要将 function_call_output 类型的消息转换为正确的格式
      const openaiInput: any[] = []

      for (const msg of messages) {
        // 处理 function_call 消息（需要在 function_call_output 之前）
        if ((msg as any)._functionCall) {
          const functionCall = (msg as any)._functionCall
          openaiInput.push(functionCall)
          continue
        }

        // 处理 function_call_output 消息
        if ((msg as any)._functionCallOutput) {
          const functionCallOutput = (msg as any)._functionCallOutput
          openaiInput.push(functionCallOutput)
          continue
        }

        // 过滤掉 role 为 'tool' 的消息（这些是 Chat Completions API 格式，Responses API 不使用）
        if (msg.role === 'tool') {
          continue
        }

        // 处理普通消息（user, assistant, system）
        const hasImageAttachments = msg.attachments?.some((a) => a.type === 'image')

        // 有图片附件时，使用 Vision 格式（只有 user 角色支持多模态内容）
        if (hasImageAttachments && msg.role === 'user') {
          const content: any[] = []

          // 添加文本内容
          if (msg.content) {
            content.push({ type: 'input_text', text: msg.content })
          }

          // 添加图片
          msg.attachments
            ?.filter((a) => a.type === 'image')
            .forEach((a) => {
              // 从文件路径读取并转换为 Base64
              const base64Data = fileToBase64(a.path)
              // 构建 data URL 格式：data:image/jpeg;base64,{BASE64_DATA}
              const imageUrl = `data:${a.mimeType};base64,${base64Data}`
              content.push({
                type: 'input_image',
                image_url: imageUrl,
                detail: 'auto'
              })
            })

          openaiInput.push({
            type: 'message',
            role: 'user',
            content
          })
        } else {
          // 无附件或非 user 角色，使用 EasyInputMessage 格式
          // Responses API 支持简化的消息格式：{ role, content }
          openaiInput.push({
            role: msg.role,
            content: msg.content
          })
        }
      }

      // Responses API 的 input 可以是字符串或 ResponseInputItem 数组
      // 这里使用数组格式，包含所有消息和 function_call_output
      const openaiMessages: any =
        openaiInput.length === 1 && typeof openaiInput[0] === 'string'
          ? openaiInput[0]
          : openaiInput

      // 构建工具列表 - OpenAI Responses API 的 tools 参数格式为对象数组
      // web_search: { type: "web_search" }
      // file_search: { type: "file_search", vector_store_ids: [...] } (需要 vector_store_ids)
      // Function Calling: { type: "function", function: {...} }
      const toolsList: any[] = []

      for (const tool of tools) {
        if (tool === 'web_search') {
          toolsList.push({ type: 'web_search' as const })
        } else if (tool === 'file_search') {
          // file_search 需要 vector_store_ids，如果没有提供则跳过
          // TODO: 未来可以从 options 中获取 vector_store_ids 配置
          logWarn('file_search tool requires vector_store_ids, skipping', {
            tool
          })
        } else if (tool === 'terminal') {
          // Function Calling 工具
          // Responses API 使用 { type: 'function', name: string, ... } 格式
          toolsList.push(terminalToolDefinition)
        } else if (tool === 'read') {
          // Function Calling 工具 - 文件读取
          toolsList.push(readToolDefinition)
        }
      }
      
      // 新增：添加 MCP 工具（转换为 Function Calling 格式）
      if (mcpClient) {
        const mcpTools = mcpClient.getToolsAsFunctionCalling()
        toolsList.push(...mcpTools)
        logDebug('MCP tools added to request', { count: mcpTools.length })
      }

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

      // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
      // logDebug('Responses API stream connection established, starting to process chunks')
      let chunkCount = 0

      // 用于跟踪工具调用状态
      const toolCallsMap = new Map<string, ToolCallInfo>()

      // 用于保存完整文本（当收到 done 事件时）
      let completeText: string | null = null

      // 用于累积 Function Calling 参数
      const functionCallArgsMap = new Map<string, string>()
      // 用于保存 Function Calling 的 call_id（itemId -> call_id）
      const functionCallIdMap = new Map<string, string>()
      // 用于保存 Function Calling 的完整信息（itemId -> function_call object）
      const functionCallMap = new Map<string, any>()

      // 处理流式响应
      for await (const chunk of stream) {
        // 检查是否已取消
        if (abortSignal?.aborted) {
          logInfo('OpenAI Responses API stream chat cancelled by user')
          return
        }

        // Responses API 使用不同的事件类型
        const chunkType = (chunk as any).type

        // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
        logInfo('OpenAI Responses API stream chat chunk received', {
          chunkType,
          chunk
        })

        switch (chunkType) {
          // 1. 输出项添加（工具调用或 AI 消息开始）
          case 'response.output_item.added': {
            const event = chunk as any
            if (event.item?.type === 'web_search_call') {
              const toolInfo: ToolCallInfo = {
                itemId: event.item.id,
                type: 'web_search',
                status: 'in_progress',
                outputIndex: event.output_index,
                timestamp: Date.now()
              }
              toolCallsMap.set(event.item.id, toolInfo)
              callbacks.onToolCallStart?.(toolInfo)

              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug('Tool call started', toolInfo)
            } else if (event.item?.type === 'file_search_call') {
              const toolInfo: ToolCallInfo = {
                itemId: event.item.id,
                type: 'file_search',
                status: 'in_progress',
                outputIndex: event.output_index,
                timestamp: Date.now()
              }
              toolCallsMap.set(event.item.id, toolInfo)
              callbacks.onToolCallStart?.(toolInfo)

              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug('Tool call started', toolInfo)
            } else if (event.item?.type === 'function_call') {
              // Function Calling 工具调用
              const callId = (event.item as any).call_id || event.item.id
              const functionName = event.item.name
              
              // 根据 function name 确定工具类型
              let toolInfo: ToolCallInfo
              if (functionName === 'read') {
                toolInfo = {
                  itemId: event.item.id,
                  type: 'read',
                  status: 'in_progress',
                  outputIndex: event.output_index,
                  timestamp: Date.now()
                }
              } else if (functionName.startsWith('mcp_')) {
                // MCP 工具
                toolInfo = {
                  itemId: event.item.id,
                  type: 'mcp',
                  status: 'in_progress',
                  outputIndex: event.output_index,
                  timestamp: Date.now()
                }
              } else {
                // 默认为 terminal tool
                toolInfo = {
                  itemId: event.item.id,
                  type: 'terminal',
                  status: 'in_progress',
                  outputIndex: event.output_index,
                  timestamp: Date.now()
                }
              }
              
              toolCallsMap.set(event.item.id, toolInfo)
              functionCallArgsMap.set(event.item.id, '')
              functionCallIdMap.set(event.item.id, callId)
              // 保存完整的 function_call 信息，用于后续递归调用
              // 注意：arguments 必须是 JSON 字符串格式
              functionCallMap.set(event.item.id, {
                type: 'function_call' as const,
                call_id: callId,
                name: functionName,
                arguments: '' // 将在 arguments.done 时更新为完整的 JSON 字符串
              })
              callbacks.onToolCallStart?.(toolInfo)

              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug('Function call started', { toolInfo, callId })
            } else if (event.item?.type === 'message' && event.item?.role === 'assistant') {
              // AI 消息开始
              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug('AI assistant message started', {
              //   itemId: event.item.id,
              //   type: event.item.type,
              //   role: event.item.role
              // })
              callbacks.onAssistantMessageStart?.({
                id: event.item.id,
                type: event.item.type,
                role: event.item.role
              })
            }
            break
          }

          // 处理 Function Calling 参数增量
          case 'response.function_call.arguments.delta': {
            const event = chunk as any
            const itemId = event.item_id
            const delta = event.delta || ''
            const currentArgs = functionCallArgsMap.get(itemId) || ''
            functionCallArgsMap.set(itemId, currentArgs + delta)
            break
          }

          // 2. 工具调用进行中
          case 'response.web_search_call.in_progress': {
            const event = chunk as any
            const toolInfo = toolCallsMap.get(event.item_id)
            if (toolInfo) {
              toolInfo.status = 'in_progress'
              callbacks.onToolCallProgress?.(toolInfo)

              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug('Tool call in progress', toolInfo)
            }
            break
          }

          // 3. 工具调用搜索中
          case 'response.web_search_call.searching': {
            const event = chunk as any
            const toolInfo = toolCallsMap.get(event.item_id)
            if (toolInfo) {
              toolInfo.status = 'searching'
              callbacks.onToolCallProgress?.(toolInfo)

              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug('Tool call searching', toolInfo)
            }
            break
          }

          // 4. 工具调用完成（初步）
          case 'response.web_search_call.completed': {
            const event = chunk as any
            const toolInfo = toolCallsMap.get(event.item_id)
            if (toolInfo) {
              toolInfo.status = 'completed'
              // 暂不调用 onToolCallComplete，等待 output_item.done 获取完整信息
              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug('Tool call completed (waiting for details)', toolInfo)
            }
            break
          }

          // 5. 输出项完成 - 获取工具调用的完整信息
          case 'response.output_item.done': {
            const event = chunk as any
            if (event.item?.type === 'web_search_call' || event.item?.type === 'file_search_call') {
              const toolInfo = toolCallsMap.get(event.item.id)
              if (toolInfo && (toolInfo.type === 'web_search' || toolInfo.type === 'file_search')) {
                toolInfo.status = 'completed'
                toolInfo.query = event.item.action?.query
                callbacks.onToolCallComplete?.(toolInfo)

                logInfo('Tool call completed with details', toolInfo)
              }
            } else if (event.item?.type === 'function_call') {
              // Function Calling 完成，执行函数
              const toolInfo = toolCallsMap.get(event.item.id)
              const functionArgs =
                functionCallArgsMap.get(event.item.id) || event.item.arguments || ''
              const functionName = event.item.name
              const callId =
                functionCallIdMap.get(event.item.id) || (event.item as any).call_id || event.item.id

              logDebug('[handleFunctionCall] Function calling completed', {
                functionName,
                functionArgs,
                callId,
                toolCallsMap
              })

              if (toolInfo && (functionName === 'execute_terminal_command' || functionName === 'read' || functionName.startsWith('mcp_'))) {
                // 更新保存的 function_call 信息，包含完整的 arguments
                const savedFunctionCall = functionCallMap.get(event.item.id)
                if (savedFunctionCall) {
                  savedFunctionCall.arguments = functionArgs
                }
                
                // 执行函数调用
                await this.handleFunctionCall(
                  { 
                    name: functionName, 
                    arguments: functionArgs, 
                    callId,
                    functionCallItem: savedFunctionCall || {
                      type: 'function_call',
                      call_id: callId,
                      name: functionName,
                      arguments: functionArgs
                    }
                  },
                  toolInfo, // 传递已创建的 toolInfo，避免重复调用 onToolCallStart
                  messages,
                  config,
                  callbacks,
                  abortSignal,
                  options || { tools }
                )
                return // 函数调用后会递归调用，这里直接返回
              }
            }
            break
          }

          // 6. 文本增量
          case 'response.output_text.delta': {
            const textDeltaEvent = chunk as ResponseTextDeltaEvent
            if (textDeltaEvent.delta) {
              chunkCount++
              callbacks.onChunk(textDeltaEvent.delta)
            }
            break
          }

          // 7. 内容部分添加
          case 'response.content_part.added': {
            const contentPartEvent = chunk as ResponseContentPartAddedEvent
            const part = contentPartEvent.part
            if (part.type === 'output_text' && 'text' in part && part.text) {
              chunkCount++
              callbacks.onChunk(part.text)
            }
            break
          }

          // 8. 文本输出完成 - 包含完整文本
          case 'response.output_text.done': {
            const event = chunk as any
            if (event.text) {
              // 保存完整文本，用于替换之前累积的 delta
              completeText = event.text
              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug('Received complete text from output_text.done', {
              //   textLength: event.text.length
              // })
            }
            break
          }

          // 9. 内容部分完成 - 包含完整文本
          case 'response.content_part.done': {
            const event = chunk as any
            if (event.part?.type === 'output_text' && event.part?.text) {
              // 保存完整文本，用于替换之前累积的 delta
              completeText = event.part.text
              // 注释掉流式输出时的日志记录，避免频繁 I/O 导致卡顿
              // logDebug('Received complete text from content_part.done', {
              //   textLength: event.part.text.length
              // })
            }
            break
          }

          // 10. 响应完成
          case 'response.completed': {
            const event = chunk as any
            logInfo('Response completed', {
              totalOutputItems: event.response?.output,
              usage: event.response?.usage
            })
            break
          }
        }
      }

      logInfo('OpenAI Responses API stream chat completed successfully', {
        model: config.model,
        totalChunks: chunkCount,
        totalToolCalls: toolCallsMap.size,
        hasCompleteText: !!completeText
      })
      // 如果有完整文本，传递完整文本用于替换之前累积的 delta
      callbacks.onDone(completeText || undefined)
    } catch (error) {
      throw error // 重新抛出，由外层处理
    }
  }

  /**
   * 处理 Function Calling
   */
  private async handleFunctionCall(
    functionCall: { 
      name: string; 
      arguments: string; 
      callId: string;
      functionCallItem?: any; // 完整的 function_call 对象，用于递归调用时包含在 input 中
    },
    toolInfo: ToolCallInfo, // 已创建的 toolInfo，onToolCallStart 已在 response.output_item.added 中调用
    messages: AIMessageInput[],
    config: AIConfig,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal,
    options?: {
      tools?: ToolType[]
    }
  ): Promise<void> {
    if (functionCall.name === 'read') {
      logDebug('[handleFunctionCall] Handling read function call', {
        functionName: functionCall.name,
        arguments: functionCall.arguments
      })

      try {
        // 解析函数参数
        logDebug('[handleFunctionCall] Parsing function call arguments', {
          rawArguments: functionCall.arguments
        })
        const args = JSON.parse(functionCall.arguments)
        const { filePath, offset, limit } = args

        logInfo('[handleFunctionCall] File read started', {
          filePath,
          offset: offset || 0,
          limit: limit || 2000,
          messagesCount: messages.length
        })

        // 更新 toolInfo 的文件路径信息
        if (toolInfo.type === 'read') {
          toolInfo.filePath = filePath
          toolInfo.offset = offset
          toolInfo.limit = limit
        }

        logDebug('[handleFunctionCall] Tool call info updated', {
          itemId: toolInfo.itemId,
          filePath: toolInfo.type === 'read' ? toolInfo.filePath : undefined
        })

        // 执行文件读取
        logDebug('[handleFunctionCall] Reading file', {
          filePath,
          offset,
          limit
        })
        const result = await readFile(filePath, { offset, limit })

        logInfo('[handleFunctionCall] File read completed', {
          filePath: result.filePath,
          success: result.success,
          totalLines: result.totalLines,
          readLines: result.readLines,
          hasMore: result.hasMore,
          hasAttachments: !!result.attachments?.length
        })

        logDebug('[handleFunctionCall] File read result details', {
          content: result.content?.substring(0, 200),
          error: result.error
        })

        // 格式化文件读取结果
        let formattedResult: string
        if (result.success) {
          if (result.attachments && result.attachments.length > 0) {
            // 图片或 PDF 文件
            formattedResult = result.content || `${result.mimeType} file read successfully`
          } else {
            // 文本文件
            formattedResult = result.content || ''
          }
        } else {
          formattedResult = `Error: ${result.error}`
        }

        logDebug('[handleFunctionCall] File read result formatted', {
          formattedResultLength: formattedResult.length
        })

        // 如果读取失败，调用 onError 通知错误并直接返回
        if (!result.success) {
          const errorMessage = result.error || 'File read failed'
          const failedToolInfo: ToolCallInfo = {
            ...toolInfo,
            status: 'failed',
            ...(toolInfo.type === 'read' ? {
              filePath: result.filePath,
              offset: result.readLines ? offset : undefined,
              limit: result.readLines ? limit : undefined
            } : {})
          }
          logWarn('[handleFunctionCall] File read failed', {
            filePath: result.filePath,
            error: errorMessage
          })
          callbacks.onError(new Error(`File read failed: ${errorMessage}`), failedToolInfo)
          return // 失败后直接返回，不继续处理
        }

        // 读取成功，继续处理
        // 通知工具调用完成（包含执行结果，用于保存到消息内容）
        const completedToolInfo: ToolCallInfo = {
          ...toolInfo,
          status: 'completed',
          ...(toolInfo.type === 'read' ? {
            filePath: result.filePath,
            offset: result.readLines ? offset : undefined,
            limit: result.readLines ? limit : undefined
          } : {})
        }
        
        // 注意：formattedResult 会作为 tool 消息传递给 AI
        // 但工具调用消息的 content 需要在 Handler 中更新
        callbacks.onToolCallComplete?.(completedToolInfo, formattedResult)

        logDebug('[handleFunctionCall] Tool call completed notification sent', {
          itemId: completedToolInfo.itemId,
          status: completedToolInfo.status
        })

        // 构建 function_call_output 消息（Responses API 格式）
        // 注意：Responses API 使用 function_call_output 类型，而不是 tool 角色
        const functionCallOutput = {
          type: 'function_call_output' as const,
          call_id: functionCall.callId,
          output: formattedResult
        }

        // 重要：在递归调用时，需要将对应的 function_call 也包含在 input 中
        // 这样 API 才能找到对应的 tool call
        if (functionCall.functionCallItem) {
          messages.push({
            role: 'user', // 临时使用，实际会在转换时处理
            content: JSON.stringify(functionCall.functionCallItem),
            // 添加标记，表示这是一个 function_call 消息
            _functionCall: functionCall.functionCallItem
          } as any)
        }

        // 将工具结果添加到消息列表（作为 ResponseInputItem）
        // 注意：这里需要将 function_call_output 作为 input 的一部分传递
        messages.push({
          role: 'user', // 临时使用 user 角色，实际会在转换时处理
          content: JSON.stringify(functionCallOutput),
          // 添加标记，表示这是一个 function_call_output 消息
          _functionCallOutput: functionCallOutput
        } as any)

        logDebug('[handleFunctionCall] Function call output added to messages list', {
          messagesCount: messages.length,
          callId: functionCall.callId,
          outputLength: formattedResult.length
        })

        // 递归调用，让 AI 基于结果继续回复
        logInfo('[handleFunctionCall] Recursively calling streamChat with file read result', {
          updatedMessagesCount: messages.length,
          model: config.model
        })
        await this.streamChat(messages, config, callbacks, abortSignal, options)
      } catch (error) {
        logError('[handleFunctionCall] Function call execution failed', {
          functionName: functionCall.name,
          arguments: functionCall.arguments,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorName: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        })
        const errorMessage = error instanceof Error ? error.message : 'Function call failed'
        // 传递 toolInfo，让 handler 知道是哪个工具出错了
        callbacks.onError(new Error(`File read execution failed: ${errorMessage}`), toolInfo)
      }
    } else if (functionCall.name === 'execute_terminal_command') {
      logDebug('[handleFunctionCall] Handling execute_terminal_command function call', {
        functionName: functionCall.name,
        arguments: functionCall.arguments
      })

      try {
        // 解析函数参数
        logDebug('[handleFunctionCall] Parsing function call arguments', {
          rawArguments: functionCall.arguments
        })
        const args = JSON.parse(functionCall.arguments)
        const { command, workingDirectory } = args

        logInfo('[handleFunctionCall] Terminal command execution started', {
          command,
          workingDirectory: workingDirectory || 'current directory',
          messagesCount: messages.length
        })

        // 注意：onToolCallStart 已在 response.output_item.added 事件中调用，这里不需要重复调用
        // 更新 toolInfo 的命令信息（用于后续的 onToolCallComplete）
        // 由于 functionName === 'execute_terminal_command'，toolInfo 一定是 TerminalToolCallInfo 类型
        if (toolInfo.type === 'terminal') {
          toolInfo.command = command
          toolInfo.workingDirectory = workingDirectory
        }

        logDebug('[handleFunctionCall] Tool call info updated', {
          itemId: toolInfo.itemId,
          command: toolInfo.type === 'terminal' ? toolInfo.command : undefined
        })

        // 执行命令
        logDebug('[handleFunctionCall] Executing terminal command', {
          command,
          workingDirectory
        })
        const result = await executeTerminalCommand(command, workingDirectory)

        logInfo('[handleFunctionCall] Terminal command execution completed', {
          command: result.command,
          workingDirectory: result.workingDirectory,
          exitCode: result.exitCode,
          executionTime: result.executionTime,
          stdoutLength: result.stdout?.length || 0,
          stderrLength: result.stderr?.length || 0,
          hasError: !!result.error
        })

        logDebug('[handleFunctionCall] Terminal command execution result details', {
          stdout: result.stdout,
          stderr: result.stderr,
          error: result.error
        })

        // 格式化命令结果
        const formattedResult = formatCommandResult(result)

        logDebug('[handleFunctionCall] Command result formatted', {
          formattedResultLength: formattedResult.length
        })

        // 判断命令是否失败（exitCode !== 0 表示失败）
        const isFailed = result.exitCode !== 0

        // 如果命令失败，调用 onError 通知错误并直接返回，不继续处理
        if (isFailed) {
          const errorMessage = result.error || result.stderr || `Command failed with exit code ${result.exitCode}`
          const failedToolInfo: ToolCallInfo = {
            ...toolInfo,
            status: 'failed',
            ...(toolInfo.type === 'terminal' ? {
              command: result.command,
              workingDirectory: result.workingDirectory
            } : {})
          }
          logWarn('[handleFunctionCall] Terminal command failed', {
            command: result.command,
            exitCode: result.exitCode,
            error: errorMessage
          })
          callbacks.onError(new Error(`Terminal command failed: ${errorMessage}`), failedToolInfo)
          return // 失败后直接返回，不继续处理
        }

        // 命令成功，继续处理
        // 通知工具调用完成（包含执行结果，用于保存到消息内容）
        const completedToolInfo: ToolCallInfo = {
          ...toolInfo,
          status: 'completed',
          ...(toolInfo.type === 'terminal' ? {
            command: result.command,
            workingDirectory: result.workingDirectory
          } : {})
        }
        
        // 注意：formattedResult 会作为 tool 消息传递给 AI
        // 但工具调用消息的 content 需要在 Handler 中更新
        callbacks.onToolCallComplete?.(completedToolInfo, formattedResult)

        logDebug('[handleFunctionCall] Tool call completed notification sent', {
          itemId: completedToolInfo.itemId,
          status: completedToolInfo.status
        })

        // 构建 function_call_output 消息（Responses API 格式）
        // 注意：Responses API 使用 function_call_output 类型，而不是 tool 角色
        const functionCallOutput = {
          type: 'function_call_output' as const,
          call_id: functionCall.callId,
          output: formattedResult
        }

        // 重要：在递归调用时，需要将对应的 function_call 也包含在 input 中
        // 这样 API 才能找到对应的 tool call
        if (functionCall.functionCallItem) {
          messages.push({
            role: 'user', // 临时使用，实际会在转换时处理
            content: JSON.stringify(functionCall.functionCallItem),
            // 添加标记，表示这是一个 function_call 消息
            _functionCall: functionCall.functionCallItem
          } as any)
        }

        // 将工具结果添加到消息列表（作为 ResponseInputItem）
        // 注意：这里需要将 function_call_output 作为 input 的一部分传递
        messages.push({
          role: 'user', // 临时使用 user 角色，实际会在转换时处理
          content: JSON.stringify(functionCallOutput),
          // 添加标记，表示这是一个 function_call_output 消息
          _functionCallOutput: functionCallOutput
        } as any)

        logDebug('[handleFunctionCall] Function call output added to messages list', {
          messagesCount: messages.length,
          callId: functionCall.callId,
          outputLength: formattedResult.length
        })

        // 递归调用，让 AI 基于结果继续回复
        logInfo('[handleFunctionCall] Recursively calling streamChat with tool result', {
          updatedMessagesCount: messages.length,
          model: config.model
        })
        await this.streamChat(messages, config, callbacks, abortSignal, options)
      } catch (error) {
        logError('[handleFunctionCall] Function call execution failed', {
          functionName: functionCall.name,
          arguments: functionCall.arguments,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorName: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        })
        const errorMessage = error instanceof Error ? error.message : 'Function call failed'
        // 传递 toolInfo，让 handler 知道是哪个工具出错了
        callbacks.onError(new Error(`Terminal command execution failed: ${errorMessage}`), toolInfo)
      }
    } else if (functionCall.name.startsWith('mcp_')) {
      // MCP 工具调用处理
      logDebug('[handleFunctionCall] Handling MCP function call', {
        functionName: functionCall.name,
        arguments: functionCall.arguments
      })

      if (!mcpClient) {
        const errorMessage = 'MCP client not initialized'
        logError('[handleFunctionCall] MCP client not initialized')
        callbacks.onError(new Error(errorMessage), toolInfo)
        return
      }

      try {
        // 解析工具名称：mcp_{serverLabel}_{toolName}
        const parts = functionCall.name.split('_')
        if (parts.length < 3) {
          throw new Error(`Invalid MCP tool name: ${functionCall.name}`)
        }

        const serverLabel = parts[1]
        const toolName = parts.slice(2).join('_')
        const args = JSON.parse(functionCall.arguments)

        logDebug('[handleFunctionCall] Calling MCP tool', {
          serverLabel,
          toolName,
          arguments: args
        })

        // 调用 MCP 工具
        const result = await mcpClient.callTool(serverLabel, toolName, args)

        // 格式化结果
        const formattedResult = typeof result === 'string' 
          ? result 
          : JSON.stringify(result, null, 2)

        // 更新工具调用信息
        const completedToolInfo: ToolCallInfo = {
          ...toolInfo,
          status: 'completed',
          ...(toolInfo.type === 'mcp' ? {
            toolName: functionCall.name,
            arguments: args
          } : {})
        }

        callbacks.onToolCallComplete?.(completedToolInfo, formattedResult)

        // 构建 function_call_output 消息
        const functionCallOutput = {
          type: 'function_call_output' as const,
          call_id: functionCall.callId,
          output: formattedResult
        }

        // 递归调用
        if (functionCall.functionCallItem) {
          messages.push({
            role: 'user',
            content: JSON.stringify(functionCall.functionCallItem),
            _functionCall: functionCall.functionCallItem
          } as any)
        }

        messages.push({
          role: 'user',
          content: JSON.stringify(functionCallOutput),
          _functionCallOutput: functionCallOutput
        } as any)

        logDebug('[handleFunctionCall] MCP tool call completed, recursively calling streamChat', {
          messagesCount: messages.length,
          callId: functionCall.callId
        })

        await this.streamChat(messages, config, callbacks, abortSignal, options)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logError('[handleFunctionCall] MCP tool call failed', {
          toolName: functionCall.name,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        })

        const failedToolInfo: ToolCallInfo = {
          ...toolInfo,
          status: 'failed'
        }

        callbacks.onError(new Error(`MCP tool call failed: ${errorMessage}`), failedToolInfo)
      }
    }
  }
}

/**
 * 格式化命令执行结果
 */
function formatCommandResult(
  result: import('../utils/tool-executor').CommandExecutionResult
): string {
  let output = `Command: ${result.command}\n`
  output += `Working Directory: ${result.workingDirectory}\n`
  output += `Exit Code: ${result.exitCode}\n`
  output += `Execution Time: ${result.executionTime}ms\n\n`

  if (result.stdout) {
    output += `STDOUT:\n${result.stdout}\n\n`
  }

  if (result.stderr) {
    output += `STDERR:\n${result.stderr}\n\n`
  }

  if (result.error) {
    output += `ERROR: ${result.error}\n`
  }

  return output
}
