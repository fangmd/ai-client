import { readFileSync } from 'fs'
import { logError, logInfo } from '../logger'

export interface DocumentParseResult {
  content: string
  metadata: {
    charset: string
  }
}

export function parseTxtFile(filePath: string): DocumentParseResult {
  try {
    const content = readFileSync(filePath, 'utf-8')
    logInfo('TXT document parsed', { filePath, length: content.length })
    return {
      content,
      metadata: {
        charset: 'utf-8'
      }
    }
  } catch (error) {
    logError('Failed to parse txt document', { filePath, error })
    throw error
  }
}
