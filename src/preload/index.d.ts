import { ElectronAPI } from '@electron-toolkit/preload'
import type { IPC_CHANNELS } from './channels'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      channels: typeof IPC_CHANNELS
    }
  }
}
