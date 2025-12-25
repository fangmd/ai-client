import { create } from 'zustand'
import type { IPCResponse, ThemeMode, ConfigItem } from '@/types'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'
import { CONFIG_KEYS, DEFAULT_CONFIG } from '@/types'
import { applyTheme, setupSystemThemeListener } from '@renderer/utils'

interface ConfigState {
  // 配置数据
  theme: ThemeMode

  // Actions
  loadConfig: () => Promise<void>
  setTheme: (mode: ThemeMode) => Promise<void>
}

export const useConfigStore = create<ConfigState>((set) => ({
  theme: DEFAULT_CONFIG[CONFIG_KEYS.THEME],

  /**
   * 从数据库加载所有配置
   */
  loadConfig: async () => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.config.getAll
      )) as IPCResponse<Record<string, string>>

      if (response.code === SUCCESS_CODE && response.data) {
        const configs = response.data
        // 解析主题配置
        if (configs[CONFIG_KEYS.THEME]) {
          try {
            const theme = configs[CONFIG_KEYS.THEME] as ThemeMode
            set({ theme })
            applyTheme(theme)
            setupSystemThemeListener(theme)
          } catch {
            // 解析失败使用默认值
            applyTheme(DEFAULT_CONFIG[CONFIG_KEYS.THEME])
            setupSystemThemeListener(DEFAULT_CONFIG[CONFIG_KEYS.THEME])
          }
        } else {
          // 没有配置时使用默认值
          applyTheme(DEFAULT_CONFIG[CONFIG_KEYS.THEME])
          setupSystemThemeListener(DEFAULT_CONFIG[CONFIG_KEYS.THEME])
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  },

  /**
   * 设置主题并保存到数据库
   */
  setTheme: async (mode: ThemeMode) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(IPC_CHANNELS.config.set, {
        key: CONFIG_KEYS.THEME,
        value: mode
      })) as IPCResponse<ConfigItem>

      if (response.code === SUCCESS_CODE) {
        set({ theme: mode })
        applyTheme(mode)
        setupSystemThemeListener(mode)
      }
    } catch (error) {
      console.error('Failed to set theme:', error)
    }
  }
}))
