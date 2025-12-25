// ==================== Config 数据库类型（主进程/Repository 使用） ====================

/**
 * 配置项（数据库实体）
 */
export interface ConfigItem {
  key: string
  value: string
  createdAt?: Date
  updatedAt?: Date
}

// ==================== Config 相关 IPC 请求类型 ====================

/**
 * 获取配置请求参数
 */
export interface GetConfigRequest {
  key: string
}

/**
 * 设置配置请求参数
 */
export interface SetConfigRequest {
  key: string
  value: string
}

/**
 * 删除配置请求参数
 */
export interface DeleteConfigRequest {
  key: string
}

