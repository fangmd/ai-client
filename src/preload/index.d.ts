import { ElectronAPI } from '@electron-toolkit/preload'
import type { Message, AIConfig } from '@/types/chat-type'
import type { IPCResponse } from './types'

// 重新导出类型以保持向后兼容
export type { AiProvider, CreateAiProviderData } from '@/types/ai-provider-type'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
