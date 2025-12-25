// ==================== AI Provider 前端类型（渲染进程使用） ====================

/**
 * AI Provider 类型（前端使用，从 IPC 传输）
 */
export interface AiProvider {
  id: bigint
  name: string | null
  provider: string
  apiKey: string
  baseURL: string | null
  model: string
  temperature: number | null
  maxTokens: number | null
  organization: string | null
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * AI Provider 创建数据（前端表单使用）
 */
export interface CreateAiProviderData {
  name?: string | null
  provider: string
  apiKey: string
  baseURL?: string | null
  model: string
  temperature?: number | null
  maxTokens?: number | null
  organization?: string | null
  isDefault?: boolean
}

/**
 * AI Provider 更新数据（前端表单使用）
 */
export interface UpdateAiProviderData {
  name?: string | null
  provider?: string
  apiKey?: string
  baseURL?: string | null
  model?: string
  temperature?: number | null
  maxTokens?: number | null
  organization?: string | null
  isDefault?: boolean
}

