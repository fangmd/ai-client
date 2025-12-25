// ==================== AI Provider 数据库类型（主进程/Repository 使用） ====================

import type { UpdateAiProviderData } from './ai-provider-frontend-type'

// ==================== AI Provider 相关 IPC 请求类型 ====================

/**
 * 更新 AI Provider 请求参数
 */
export interface UpdateAiProviderRequest {
  id: bigint
  data: UpdateAiProviderData
}

/**
 * 删除 AI Provider 请求参数
 */
export interface DeleteAiProviderRequest {
  id: bigint
}

/**
 * 设置默认 AI Provider 请求参数
 */
export interface SetDefaultAiProviderRequest {
  id: bigint
}
