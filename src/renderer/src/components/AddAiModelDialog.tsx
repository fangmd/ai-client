import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import type { CreateAiProviderData, AiProvider } from '@/types/ai-provider'
import type { IPCResponse } from '@/preload/types'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'

interface AddAiModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const AddAiModelDialog: React.FC<AddAiModelDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CreateAiProviderData>({
    name: '',
    provider: 'openai',
    apiKey: '',
    baseURL: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    organization: '',
    isDefault: false
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!formData.apiKey || !formData.model) {
      alert('请填写 API Key 和 Model')
      return
    }

    setLoading(true)
    try {
      const response = await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.create,
        formData
      ) as IPCResponse<AiProvider>

      if (response.code === SUCCESS_CODE) {
        onOpenChange(false)
        // 重置表单
        setFormData({
          name: '',
          provider: 'openai',
          apiKey: '',
          baseURL: '',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 2000,
          organization: '',
          isDefault: false
        })
        onSuccess?.()
      } else {
        alert(`创建失败: ${response.msg}`)
      }
    } catch (error) {
      alert(`创建失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>添加 AI Model</DialogTitle>
          <DialogDescription>添加一个新的 AI 提供商配置</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              名称 (可选)
            </label>
            <input
              id="name"
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border rounded-md bg-background text-foreground"
              placeholder="My OpenAI Config"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="provider" className="text-sm font-medium">
              提供商
            </label>
            <select
              id="provider"
              value={formData.provider}
              onChange={(e) =>
                setFormData({ ...formData, provider: e.target.value as CreateAiProviderData['provider'] })
              }
              className="px-3 py-2 border rounded-md bg-background text-foreground"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="apiKey" className="text-sm font-medium">
              API Key *
            </label>
            <input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="px-3 py-2 border rounded-md bg-background text-foreground"
              placeholder="sk-..."
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="baseURL" className="text-sm font-medium">
              Base URL (可选)
            </label>
            <input
              id="baseURL"
              type="text"
              value={formData.baseURL || ''}
              onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
              className="px-3 py-2 border rounded-md bg-background text-foreground"
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="model" className="text-sm font-medium">
              Model *
            </label>
            <input
              id="model"
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="px-3 py-2 border rounded-md bg-background text-foreground"
              placeholder="gpt-3.5-turbo"
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="temperature" className="text-sm font-medium">
              Temperature: {formData.temperature}
            </label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature || 0.7}
              onChange={(e) =>
                setFormData({ ...formData, temperature: parseFloat(e.target.value) })
              }
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="maxTokens" className="text-sm font-medium">
              Max Tokens
            </label>
            <input
              id="maxTokens"
              type="number"
              value={formData.maxTokens || 2000}
              onChange={(e) =>
                setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 2000 })
              }
              className="px-3 py-2 border rounded-md bg-background text-foreground"
            />
          </div>
          {formData.provider === 'openai' && (
            <div className="grid gap-2">
              <label htmlFor="organization" className="text-sm font-medium">
                Organization ID (可选)
              </label>
              <input
                id="organization"
                type="text"
                value={formData.organization || ''}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="px-3 py-2 border rounded-md bg-background text-foreground"
                placeholder="org-..."
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              id="isDefault"
              type="checkbox"
              checked={formData.isDefault || false}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isDefault" className="text-sm font-medium">
              设为默认提供商
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
