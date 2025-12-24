/**
 * 文件上传相关常量
 */

/** 允许的图片类型 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
] as const

/** 最大文件大小 (20MB) */
export const MAX_FILE_SIZE = 20 * 1024 * 1024

/** 单条消息最大附件数 */
export const MAX_ATTACHMENTS = 10

/** 文件类型对应的 Accept 字符串 */
export const IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp'

