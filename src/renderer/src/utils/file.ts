import { ALLOWED_IMAGE_TYPES } from '@/common/constants/file'
import { IPC_CHANNELS } from '@/common/constants/ipc'
import type {
  UploadFileRequest,
  UploadFileResponse,
  SelectFilesRequest,
  SelectFilesResponse,
  ReadFileRequest,
  ReadFileResponse,
  IPCResponse
} from '@/types'

/**
 * 读取文件为 Base64（已废弃，保留用于兼容）
 * @deprecated 使用 uploadFile 替代
 */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 移除 data:xxx;base64, 前缀
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 验证文件是否为允许的图片类型
 */
export const isAllowedImageType = (mimeType: string): boolean => {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)
}

/**
 * 选择文件（使用 dialog API）
 * @param options 文件选择选项
 * @returns 选中的文件列表
 */
export async function selectFiles(
  options: SelectFilesRequest
): Promise<SelectFilesResponse> {
  const response = (await window.electron.ipcRenderer.invoke(
    IPC_CHANNELS.file.select,
    options
  )) as IPCResponse<SelectFilesResponse>

  if (response.code === 0 && response.data) {
    return response.data
  } else {
    throw new Error(response.msg || 'Failed to select files')
  }
}

/**
 * 上传文件到主进程
 * @param request 文件上传请求
 * @returns 附件信息（包含 path）
 */
export async function uploadFile(request: UploadFileRequest): Promise<UploadFileResponse> {
  const response = (await window.electron.ipcRenderer.invoke(
    IPC_CHANNELS.file.upload,
    request
  )) as IPCResponse<UploadFileResponse>

  if (response.code === 0 && response.data) {
    return response.data
  } else {
    throw new Error(response.msg || 'Failed to upload file')
  }
}

/**
 * 获取文件的 data URI（用于前端显示）
 * @param filePath 文件路径
 * @param mimeType MIME 类型
 * @returns data URI 字符串
 */
export async function getFileDataUri(filePath: string, mimeType: string): Promise<string> {
  const request: ReadFileRequest = {
    path: filePath,
    mimeType
  }
  const response = (await window.electron.ipcRenderer.invoke(
    IPC_CHANNELS.file.read,
    request
  )) as IPCResponse<ReadFileResponse>

  if (response.code === 0 && response.data) {
    return `data:${mimeType};base64,${response.data.data}`
  } else {
    throw new Error(response.msg || 'Failed to read file')
  }
}

