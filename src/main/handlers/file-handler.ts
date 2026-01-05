import { ipcMain, dialog } from 'electron'
import { statSync } from 'fs'
import path from 'path'
import { IPC_CHANNELS } from '@/common/constants/ipc'
import { responseSuccess, responseError } from '@/common/response'
import { generateUUID } from '@/main/utils/snowflake'
import { saveFileFromPath, readFile } from '@/main/utils/file-storage'
import { logInfo, logError } from '@/main/utils'
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
 * 根据文件扩展名推断 MIME 类型
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * File Handler
 * 处理文件上传相关的 IPC 请求
 */
export class FileHandler {
  /**
   * 注册所有 File 相关的 IPC 处理器
   */
  static register(): void {
    // 上传文件（从文件路径读取并保存）
    ipcMain.handle(
      IPC_CHANNELS.file.upload,
      async (_event, data: UploadFileRequest): Promise<IPCResponse<UploadFileResponse>> => {
        logInfo('【IPC Handler】file:upload called', {
          filePath: data.filePath,
          name: data.name,
          mimeType: data.mimeType,
          size: data.size
        })

        try {
          // 生成附件 ID
          const attachmentId = generateUUID().valueOf() as bigint

          // 从源文件路径读取并保存到缓存目录
          const filePath = saveFileFromPath(attachmentId, data.filePath, data.name)

          const response = responseSuccess<UploadFileResponse>({
            attachmentId,
            path: filePath
          })

          logInfo('【IPC Handler】file:upload success', response)
          return response
        } catch (error) {
          const response = responseError(error) as IPCResponse<UploadFileResponse>
          logError('【IPC Handler】file:upload error', response)
          return response
        }
      }
    )

    // 文件选择对话框
    ipcMain.handle(
      IPC_CHANNELS.file.select,
      async (_event, options: SelectFilesRequest): Promise<IPCResponse<SelectFilesResponse>> => {
        logInfo('【IPC Handler】file:select called', options)

        try {
          const result = await dialog.showOpenDialog({
            filters: options.filters || [],
            properties: (options.properties as any) || ['openFile']
          })

          if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return responseSuccess<SelectFilesResponse>({ files: [] })
          }

          // 获取文件信息
          const files = result.filePaths.map((filePath) => {
            const stats = statSync(filePath)
            return {
              path: filePath,
              name: path.basename(filePath),
              size: stats.size,
              mimeType: getMimeType(filePath)
            }
          })

          const response = responseSuccess<SelectFilesResponse>({ files })
          logInfo('【IPC Handler】file:select success', response)
          return response
        } catch (error) {
          const response = responseError(error) as IPCResponse<SelectFilesResponse>
          logError('【IPC Handler】file:select error', response)
          return response
        }
      }
    )

    // 读取文件（用于前端显示）
    ipcMain.handle(
      IPC_CHANNELS.file.read,
      async (_event, data: ReadFileRequest): Promise<IPCResponse<ReadFileResponse>> => {
        logInfo('【IPC Handler】file:read called', {
          path: data.path,
          mimeType: data.mimeType
        })

        try {
          const buffer = readFile(data.path)
          const base64 = buffer.toString('base64')
          const response = responseSuccess<ReadFileResponse>({ data: base64 })
          logInfo('【IPC Handler】file:read success')
          return response
        } catch (error) {
          const response = responseError(error) as IPCResponse<ReadFileResponse>
          logError('【IPC Handler】file:read error', response)
          return response
        }
      }
    )
  }

  /**
   * 注销所有 File 相关的 IPC 处理器
   */
  static unregister(): void {
    ipcMain.removeHandler(IPC_CHANNELS.file.upload)
    ipcMain.removeHandler(IPC_CHANNELS.file.select)
    ipcMain.removeHandler(IPC_CHANNELS.file.read)
  }
}

