import { createContext, useContext, useEffect, useState } from 'react'
import { useConfigStore } from '@renderer/stores/configStore'
import type { ThemeMode } from '@/types'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: ThemeMode
  storageKey?: string
}

type ThemeProviderState = {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ai-client-theme',
  ...props
}: ThemeProviderProps) {
  const { theme: storeTheme, loadConfig, setTheme: setStoreTheme } = useConfigStore()
  const [theme, setThemeState] = useState<ThemeMode>(
    () => (localStorage.getItem(storageKey) as ThemeMode) || defaultTheme
  )
  const [isLoaded, setIsLoaded] = useState(false)

  // 初始化时从数据库加载配置
  useEffect(() => {
    loadConfig().then(() => {
      setIsLoaded(true)
    })
  }, [loadConfig])

  // 当 store 中的主题更新时，同步到本地状态
  useEffect(() => {
    if (isLoaded) {
      setThemeState(storeTheme)
    }
  }, [storeTheme, isLoaded])

  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = () => {
      root.classList.remove('light', 'dark')

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(systemTheme)
        return
      }

      root.classList.add(theme)
    }

    // 初始应用主题
    applyTheme()

    // 如果主题是 'system'，监听系统主题变化
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = () => {
        applyTheme()
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
    return undefined
  }, [theme])

  const setTheme = (newTheme: ThemeMode) => {
    // 同时更新 localStorage（向后兼容）和数据库
    localStorage.setItem(storageKey, newTheme)
    setThemeState(newTheme)
    setStoreTheme(newTheme)
  }

  const value = {
    theme,
    setTheme
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
