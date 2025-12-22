import { ElectronAPI } from '@electron-toolkit/preload'
import type { Message, AIConfig } from '@/types/chat'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      channels: typeof import('../common/constants').IPC_CHANNELS
      ai: {
        streamChat: (
          messages: Omit<Message, 'id' | 'timestamp'>[],
          config: AIConfig,
          callbacks: {
            onChunk: (chunk: string) => void
            onDone: () => void
            onError: (error: string) => void
          }
        ) => string
        cancelChat: (requestId: string) => Promise<void>
      }
    }
  }
}
