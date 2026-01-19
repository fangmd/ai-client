import path from 'path'
import { parseMarkdownFile, type DocumentParseResult as MarkdownResult } from './markdown'
import { parseTxtFile, type DocumentParseResult as TxtResult } from './txt'

export type DocumentParseResult = MarkdownResult | TxtResult

export function parseDocument(filePath: string): DocumentParseResult {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.md' || ext === '.markdown') {
    return parseMarkdownFile(filePath)
  }
  if (ext === '.txt') {
    return parseTxtFile(filePath)
  }

  throw new Error(`Unsupported document type: ${ext}`)
}
