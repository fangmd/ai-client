import { create } from 'zustand'
import type { IPCResponse, ThemeMode, ConfigItem } from '@/types'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'
import { CONFIG_KEYS, DEFAULT_CONFIG } from '@/types/config-type'

interface ConfigState {
  // 配置数据
  theme: ThemeMode

  // Actions
  loadConfig: () => Promise<void>
  setTheme: (mode: ThemeMode) => Promise<void>
}

/**
 * 应用主题到 DOM
 */
const applyTheme = (theme: ThemeMode): void => {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

// 监听系统主题变化
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null

const setupSystemThemeListener = (theme: ThemeMode): void => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  // 移除旧的监听器
  if (mediaQueryListener) {
    mediaQuery.removeEventListener('change', mediaQueryListener)
    mediaQueryListener = null
  }

  // 如果是跟随系统，添加监听器
  if (theme === 'system') {
    mediaQueryListener = () => applyTheme('system')
    mediaQuery.addEventListener('change', mediaQueryListener)
  }
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
