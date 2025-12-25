import { ElectronAPI } from '@electron-toolkit/preload'
import type { Message, AIConfig } from '@/types'
import type { IPCResponse } from './types'

// 重新导出类型以保持向后兼容
export type { AiProvider, CreateAiProviderData } from '@/types'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
