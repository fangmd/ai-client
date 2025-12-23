import type { ThemeMode } from '@/types'

// 系统主题变化监听器
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null

/**
 * 应用主题到 DOM
 */
export const applyTheme = (theme: ThemeMode): void => {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

/**
 * 设置系统主题监听器
 * 当主题为 system 时，监听系统主题变化并自动更新
 */
export const setupSystemThemeListener = (theme: ThemeMode): void => {
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

