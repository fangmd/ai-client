// AI Provider 类型定义（与 Prisma schema 保持一致）
export interface AiProvider {
  id: string
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

// AI Provider 创建数据（与 Prisma.AiProviderCreateInput 保持一致）
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
