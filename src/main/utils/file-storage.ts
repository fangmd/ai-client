import { app } from 'electron'
import path from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs'
import { logInfo, logError } from './logger'

/**
 * 获取附件缓存目录路径
 */
export function getAttachmentsCacheDir(): string {
  let baseDir: string

  // 生产模式：userData/cache/attachments
  const userDataPath = app.getPath('userData')
  baseDir = path.join(userDataPath, 'cache', 'attachments')

  // 确保目录存在
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true })
  }

  return baseDir
}

/**
 * 生成文件路径
 * @param attachmentId 附件 ID
 * @param originalName 原始文件名（用于提取扩展名）
 */
export function generateFilePath(attachmentId: bigint, originalName: string): string {
  const cacheDir = getAttachmentsCacheDir()
  const ext = path.extname(originalName) || '.bin'
  const fileName = `${attachmentId}${ext}`
  return path.join(cacheDir, fileName)
}

/**
 * 从源文件路径复制文件到缓存目录
 * @param attachmentId 附件 ID
 * @param sourcePath 源文件路径（用户选择的文件）
 * @param originalName 原始文件名（用于提取扩展名）
 * @returns 文件路径（相对路径）
 */
export function saveFileFromPath(
  attachmentId: bigint,
  sourcePath: string,
  originalName: string
): string {
  try {
    // 检查源文件是否存在
    if (!existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`)
    }

    const targetPath = generateFilePath(attachmentId, originalName)

    // 确保目标文件所在目录存在
    const targetDir = path.dirname(targetPath)
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    // 读取源文件并写入目标路径
    const buffer = readFileSync(sourcePath)
    writeFileSync(targetPath, buffer)

    logInfo('File saved from path', {
      attachmentId: attachmentId.toString(),
      sourcePath,
      targetPath,
      size: buffer.length
    })

    // 返回相对路径（相对于缓存目录）
    const cacheDir = getAttachmentsCacheDir()
    return path.relative(cacheDir, targetPath)
  } catch (error) {
    logError('Failed to save file from path', error)
    throw error
  }
}

/**
 * 读取文件
 * @param filePath 文件路径（相对路径或绝对路径）
 * @returns 文件 Buffer
 */
export function readFile(filePath: string): Buffer {
  try {
    const cacheDir = getAttachmentsCacheDir()
    // 如果是相对路径，拼接缓存目录
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cacheDir, filePath)

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`)
    }

    return readFileSync(fullPath)
  } catch (error) {
    logError('Failed to read file', error)
    throw error
  }
}

/**
 * 删除文件
 * @param filePath 文件路径（相对路径或绝对路径）
 */
export function deleteFile(filePath: string): void {
  try {
    const cacheDir = getAttachmentsCacheDir()
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cacheDir, filePath)

    if (existsSync(fullPath)) {
      unlinkSync(fullPath)
      logInfo('File deleted', { path: fullPath })
    }
  } catch (error) {
    logError('Failed to delete file', error)
    // 删除失败不抛出异常，避免影响主流程
  }
}

/**
 * 将文件转换为 Base64（用于 API 调用）
 * @param filePath 文件路径
 * @returns Base64 字符串（不含 data URI 前缀）
 */
export function fileToBase64(filePath: string): string {
  const buffer = readFile(filePath)
  return buffer.toString('base64')
}
