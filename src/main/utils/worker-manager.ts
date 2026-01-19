import { logInfo } from './logger'
import { parseDocument } from './document-parser'
import { chunkText } from './text-chunker'
import { embedTexts } from '@/main/providers/embedding/local'

export type WorkerTaskPayload =
  | { type: 'parseDocument'; payload: { filePath: string } }
  | { type: 'chunkText'; payload: { content: string; options?: { chunkSize?: number; overlapRatio?: number } } }
  | { type: 'embedTexts'; payload: { texts: string[] } }

/**
 * 直接在主线程执行任务，不使用 Worker
 */
export async function runWorkerTask<T = unknown>(task: WorkerTaskPayload): Promise<T> {
  logInfo('Task executing', { type: task.type })

  try {
    switch (task.type) {
      case 'parseDocument': {
        const result = parseDocument(task.payload.filePath)
        return result as T
      }
      case 'chunkText': {
        const result = chunkText(task.payload.content, task.payload.options)
        return result as T
      }
      case 'embedTexts': {
        const result = await embedTexts(task.payload.texts)
        return result as T
      }
      default: {
        const unknownTask = task as WorkerTaskPayload
        throw new Error(`Unknown task type: ${unknownTask.type}`)
      }
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}
