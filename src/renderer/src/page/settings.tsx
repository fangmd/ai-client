import { useTheme } from '@renderer/components/theme-provider'
import { Button } from '@renderer/components/ui/button'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import type { ThemeMode } from '@/types'

interface ThemeOption {
  value: ThemeMode
  label: string
  icon: React.ReactNode
}

const themeOptions: ThemeOption[] = [
  { value: 'light', label: '浅色', icon: <Sun className="size-5" /> },
  { value: 'dark', label: '深色', icon: <Moon className="size-5" /> },
  { value: 'system', label: '跟随系统', icon: <Monitor className="size-5" /> }
]

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex-1 p-8 bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">设置</h1>

        {/* 主题设置 */}
        <section className="mb-8">
          <h2 className="text-lg font-medium mb-4">外观</h2>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3">
              <span className="text-sm font-medium">主题模式</span>
              <p className="text-sm text-muted-foreground">选择应用的主题外观</p>
            </div>
            <div className="flex gap-3">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={theme === option.value ? 'default' : 'outline'}
                  className="flex-1 h-auto py-3 flex-col gap-2"
                  onClick={() => setTheme(option.value)}
                >
                  {option.icon}
                  <span className="text-sm">{option.label}</span>
                  {theme === option.value && (
                    <Check className="size-4 absolute top-2 right-2" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

