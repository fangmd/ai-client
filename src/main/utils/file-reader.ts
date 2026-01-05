import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import { logInfo, logError, logWarn } from './logger'
import * as os from 'os'
import { app } from 'electron'

const readFileAsync = promisify(fs.readFile)
const statAsync = promisify(fs.stat)
const readdirAsync = promisify(fs.readdir)

/**
 * 默认读取行数限制
 */
const DEFAULT_READ_LIMIT = 2000

/**
 * 最大单行长度（字符）
 */
const MAX_LINE_LENGTH = 2000

/**
 * 文件读取结果
 */
export interface FileReadResult {
  success: boolean
  filePath: string
  title: string              // 相对路径（用于显示）
  content?: string           // 文本文件内容
  mimeType?: string          // MIME 类型
  size?: number              // 文件大小（字节）
  totalLines?: number        // 总行数
  readLines?: number         // 已读取行数
  hasMore?: boolean          // 是否还有更多内容
  preview?: string           // 预览内容（前20行）
  attachments?: Array<{     // 附件（图片、PDF等）
    id: string
    type: 'file'
    mime: string
    url: string              // base64 data URL
  }>
  error?: string             // 错误信息（如果有）
}

/**
 * 获取项目根目录（工作目录）
 */
function getProjectRoot(): string {
  // 开发模式下使用当前工作目录
  if (!app.isPackaged) {
    return process.cwd()
  }
  // 生产模式下使用 userData 目录的父目录，或当前工作目录
  try {
    const userDataPath = app.getPath('userData')
    // 返回 userData 的父目录，或使用当前工作目录
    return path.dirname(userDataPath) || process.cwd()
  } catch {
    return process.cwd()
  }
}

/**
 * 验证路径是否允许访问
 */
function isPathAllowed(filePath: string, bypassCwdCheck: boolean = false): boolean {
  const resolvedPath = path.resolve(filePath)
  const homeDir = os.homedir()
  const projectRoot = getProjectRoot()
  
  // 如果启用 bypassCwdCheck，允许访问所有路径
  if (bypassCwdCheck) {
    return true
  }
  
  // 允许访问用户目录及其子目录
  if (resolvedPath.startsWith(homeDir)) {
    return true
  }
  
  // 允许访问项目目录及其子目录
  if (resolvedPath.startsWith(projectRoot)) {
    return true
  }
  
  // 允许访问临时目录
  if (resolvedPath.startsWith(os.tmpdir())) {
    return true
  }
  
  return false
}

/**
 * 检查文件是否为二进制文件
 */
async function isBinaryFile(filePath: string, file: Buffer): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase()
  
  // 二进制文件扩展名列表
  const binaryExtensions = [
    '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.class',
    '.jar', '.war', '.7z', '.doc', '.docx', '.xls', '.xlsx',
    '.ppt', '.pptx', '.odt', '.ods', '.odp', '.bin', '.dat',
    '.obj', '.o', '.a', '.lib', '.wasm', '.pyc', '.pyo'
  ]
  
  if (binaryExtensions.includes(ext)) {
    return true
  }
  
  // 检查文件大小
  const fileSize = file.length
  if (fileSize === 0) {
    return false
  }
  
  // 读取前 4096 字节检查
  const bufferSize = Math.min(4096, fileSize)
  const bytes = file.slice(0, bufferSize)
  
  // 检查是否包含 null 字节
  if (bytes.includes(0)) {
    return true
  }
  
  // 检查非打印字符比例
  let nonPrintableCount = 0
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    // 允许制表符(9)、换行符(10)、回车符(13)
    if (byte < 9 || (byte > 13 && byte < 32)) {
      nonPrintableCount++
    }
  }
  
  // 如果超过 30% 是非打印字符，认为是二进制文件
  return nonPrintableCount / bytes.length > 0.3
}

/**
 * 获取文件的 MIME 类型
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.jsx': 'text/javascript',
    '.tsx': 'text/typescript',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.md': 'text/markdown',
    '.py': 'text/x-python',
    '.java': 'text/x-java-source',
    '.c': 'text/x-c',
    '.cpp': 'text/x-c++',
    '.h': 'text/x-c',
    '.hpp': 'text/x-c++',
    '.go': 'text/x-go',
    '.rs': 'text/x-rust',
    '.php': 'text/x-php',
    '.rb': 'text/x-ruby',
    '.sh': 'text/x-shellscript',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.xml': 'text/xml',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * 读取文件内容
 */
export async function readFile(
  filePath: string,
  options?: {
    offset?: number
    limit?: number
    bypassCwdCheck?: boolean
  }
): Promise<FileReadResult> {
  const startTime = Date.now()
  const { offset = 0, limit = DEFAULT_READ_LIMIT, bypassCwdCheck = false } = options || {}
  
  let resolvedPath = filePath
  
  // 处理相对路径：转换为绝对路径
  if (!path.isAbsolute(filePath)) {
    resolvedPath = path.join(getProjectRoot(), filePath)
  }
  
  resolvedPath = path.resolve(resolvedPath)
  
  // 计算相对路径（用于显示）
  const projectRoot = getProjectRoot()
  const title = path.relative(projectRoot, resolvedPath)
  
  logInfo('Reading file', {
    filePath: resolvedPath,
    title,
    offset,
    limit,
    bypassCwdCheck
  })
  
  // 1. 路径安全验证
  if (!isPathAllowed(resolvedPath, bypassCwdCheck)) {
    const error = `Access denied: File path "${resolvedPath}" is not allowed`
    logWarn('File access denied', { filePath: resolvedPath })
    return {
      success: false,
      filePath: resolvedPath,
      title,
      error
    }
  }
  
  try {
    // 2. 检查文件是否存在
    const stats = await statAsync(resolvedPath)
    if (!stats.isFile()) {
      const error = `Path "${resolvedPath}" is not a file`
      logWarn('Path is not a file', { filePath: resolvedPath })
      return {
        success: false,
        filePath: resolvedPath,
        title,
        error
      }
    }
    
    // 3. 读取文件
    const fileBuffer = await readFileAsync(resolvedPath)
    const mimeType = getMimeType(resolvedPath)
    const size = fileBuffer.length
    
    // 4. 处理图片和 PDF 文件
    const isImage = mimeType.startsWith('image/') && mimeType !== 'image/svg+xml'
    const isPdf = mimeType === 'application/pdf'
    
    if (isImage || isPdf) {
      const base64 = fileBuffer.toString('base64')
      const dataUrl = `data:${mimeType};base64,${base64}`
      
      logInfo('Image/PDF file read successfully', {
        filePath: resolvedPath,
        mimeType,
        size
      })
      
      return {
        success: true,
        filePath: resolvedPath,
        title,
        mimeType,
        size,
        attachments: [
          {
            id: `read-${Date.now()}`,
            type: 'file',
            mime: mimeType,
            url: dataUrl
          }
        ],
        content: `${isImage ? 'Image' : 'PDF'} read successfully`
      }
    }
    
    // 5. 检查二进制文件
    const isBinary = await isBinaryFile(resolvedPath, fileBuffer)
    if (isBinary) {
      const error = `Cannot read binary file: ${resolvedPath}`
      logWarn('Binary file detected', { filePath: resolvedPath })
      return {
        success: false,
        filePath: resolvedPath,
        title,
        mimeType,
        size,
        error
      }
    }
    
    // 6. 处理文本文件
    const text = fileBuffer.toString('utf-8')
    const lines = text.split('\n')
    const totalLines = lines.length
    
    // 截取指定范围的行
    const startLine = Math.max(0, offset)
    const endLine = Math.min(startLine + limit, totalLines)
    const readLines = lines.slice(startLine, endLine)
    
    // 截断过长的行
    const truncatedLines = readLines.map((line) => {
      return line.length > MAX_LINE_LENGTH
        ? line.substring(0, MAX_LINE_LENGTH) + '...'
        : line
    })
    
    // 格式化输出（带行号）
    const content = truncatedLines.map((line, index) => {
      const lineNumber = startLine + index + 1
      return `${lineNumber.toString().padStart(5, '0')}| ${line}`
    })
    
    // 生成预览（前20行）
    const preview = truncatedLines.slice(0, 20).join('\n')
    
    // 构建输出
    let output = '<file>\n'
    output += content.join('\n')
    
    const hasMore = totalLines > endLine
    if (hasMore) {
      output += `\n\n(File has more lines. Use 'offset' parameter to read beyond line ${endLine})`
    } else {
      output += `\n\n(End of file - total ${totalLines} lines)`
    }
    output += '\n</file>'
    
    const executionTime = Date.now() - startTime
    
    logInfo('File read successfully', {
      filePath: resolvedPath,
      totalLines,
      readLines: readLines.length,
      hasMore,
      executionTime
    })
    
    return {
      success: true,
      filePath: resolvedPath,
      title,
      content: output,
      mimeType,
      size,
      totalLines,
      readLines: readLines.length,
      hasMore,
      preview
    }
  } catch (error: any) {
    // 文件不存在，提供建议
    if (error.code === 'ENOENT') {
      const dir = path.dirname(resolvedPath)
      const base = path.basename(resolvedPath)
      
      try {
        const dirEntries = await readdirAsync(dir)
        const suggestions = dirEntries
          .filter((entry) => {
            const entryLower = entry.toLowerCase()
            const baseLower = base.toLowerCase()
            return entryLower.includes(baseLower) || baseLower.includes(entryLower)
          })
          .map((entry) => path.join(dir, entry))
          .slice(0, 3)
        
        let errorMsg = `File not found: ${resolvedPath}`
        if (suggestions.length > 0) {
          errorMsg += `\n\nDid you mean one of these?\n${suggestions.join('\n')}`
        }
        
        logWarn('File not found with suggestions', {
          filePath: resolvedPath,
          suggestions
        })
        
        return {
          success: false,
          filePath: resolvedPath,
          title,
          error: errorMsg
        }
      } catch (dirError) {
        // 如果无法读取目录，返回简单错误
        logError('Failed to read directory for suggestions', dirError)
      }
    }
    
    const errorMsg = error.message || 'Unknown error occurred'
    logError('File read failed', {
      filePath: resolvedPath,
      error: errorMsg,
      errorCode: error.code
    })
    
    return {
      success: false,
      filePath: resolvedPath,
      title,
      error: errorMsg
    }
  }
}

