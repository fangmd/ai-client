import type { Message, AIConfig } from '@/types'

export interface StreamOptions {
  onChunk?: (chunk: string) => void
  onDone?: () => void
  onError?: (error: Error) => void
  abortSignal?: AbortSignal
}

export class AIService {
  private config: AIConfig | null = null

  setConfig(config: AIConfig) {
    this.config = config
  }

  async streamChat(
    messages: Omit<Message, 'id' | 'timestamp'>[],
    options: StreamOptions = {}
  ): Promise<void> {
    if (!this.config) {
      throw new Error('AI config not set')
    }

    const { onChunk, onDone, onError, abortSignal } = options

    try {
      if (this.config.provider === 'openai') {
        await this.streamOpenAI(messages, { onChunk, onDone, onError, abortSignal })
      } else if (this.config.provider === 'anthropic') {
        await this.streamAnthropic(messages, { onChunk, onDone, onError, abortSignal })
      } else {
        throw new Error(`Unsupported provider: ${this.config.provider}`)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      onError?.(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  private async streamOpenAI(
    messages: Omit<Message, 'id' | 'timestamp'>[],
    options: StreamOptions
  ): Promise<void> {
    const { onChunk, onDone, onError, abortSignal } = options
    const config = this.config!

    const response = await fetch(config.baseURL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens
      }),
      signal: abortSignal
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            onDone?.()
            return
          }

          try {
            const json = JSON.parse(data)
            const content = json.choices?.[0]?.delta?.content
            if (content) {
              onChunk?.(content)
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    onDone?.()
  }

  private async streamAnthropic(
    messages: Omit<Message, 'id' | 'timestamp'>[],
    options: StreamOptions
  ): Promise<void> {
    const { onChunk, onDone, onError, abortSignal } = options
    const config = this.config!

    const response = await fetch(
      config.baseURL || 'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages
            .filter((msg) => msg.role !== 'system')
            .map((msg) => ({
              role: msg.role,
              content: msg.content
            })),
          stream: true,
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens ?? 4096
        }),
        signal: abortSignal
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            onDone?.()
            return
          }

          try {
            const json = JSON.parse(data)
            if (json.type === 'content_block_delta') {
              const content = json.delta?.text
              if (content) {
                onChunk?.(content)
              }
            } else if (json.type === 'message_stop') {
              onDone?.()
              return
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    onDone?.()
  }
}

export const aiService = new AIService()
