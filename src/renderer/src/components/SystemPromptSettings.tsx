import React, { useState, useEffect } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import { useConfigStore } from '@renderer/stores/configStore'
import { Save, Loader2 } from 'lucide-react'

/**
 * 系统提示词设置组件
 * 用于在设置页面中配置全局系统提示词
 */
export const SystemPromptSettings: React.FC = () => {
  const { systemPrompt, setSystemPrompt } = useConfigStore()
  const [localPrompt, setLocalPrompt] = useState(systemPrompt)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 当 store 中的 systemPrompt 变化时，同步到本地状态
  useEffect(() => {
    setLocalPrompt(systemPrompt)
  }, [systemPrompt])

  // 处理保存
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await setSystemPrompt(localPrompt)
      setSaved(true)
      // 2秒后隐藏保存成功提示
      setTimeout(() => {
        setSaved(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to save system prompt:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 检查是否有未保存的更改
  const hasChanges = localPrompt !== systemPrompt

  return (
    <section className="mb-8">
      <h2 className="text-lg font-medium mb-4">AI 设置</h2>
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3">
          <span className="text-sm font-medium">系统提示词</span>
          <p className="text-sm text-muted-foreground mt-1">
            设置全局系统提示词，将应用于所有 AI 对话。留空则禁用此功能。
          </p>
        </div>
        <Textarea
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          placeholder="例如：你是一个专业的编程助手，擅长解释代码和解决技术问题。请用简洁明了的方式回答问题。"
          rows={6}
          className="mb-3 font-mono text-sm max-h-100"
        />
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {hasChanges && <span className="text-orange-500">有未保存的更改</span>}
            {saved && <span className="text-green-500">保存成功</span>}
          </div>
          <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="size-4 mr-2" />
                保存
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  )
}
