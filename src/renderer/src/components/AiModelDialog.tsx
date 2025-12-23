import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Slider } from '@renderer/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import type { CreateAiProviderData, AiProvider, UpdateAiProviderData } from '@/types/ai-provider-type'
import { useAiProviderStore } from '@renderer/stores/ai-provider-store'
import { logDebug } from '@renderer/utils'

interface AiModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editProvider?: AiProvider // 编辑模式：传入要编辑的 Provider
}

// 默认表单数据
const defaultFormData: CreateAiProviderData = {
  name: '',
  provider: 'openai',
  apiKey: '',
  baseURL: '',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  organization: '',
  isDefault: false
}

export const AiModelDialog: React.FC<AiModelDialogProps> = ({
  open,
  onOpenChange,
  editProvider
}) => {
  const { createProvider, updateProvider, loadProviders } = useAiProviderStore()
  const isEditMode = !!editProvider
  const [formData, setFormData] = useState<CreateAiProviderData>(defaultFormData)
  const [loading, setLoading] = useState(false)

  // 编辑模式下，填充现有数据
  useEffect(() => {
    if (open && editProvider) {
      setFormData({
        name: editProvider.name || '',
        provider: editProvider.provider,
        apiKey: '', // 编辑模式下不显示原 API Key
        baseURL: editProvider.baseURL || '',
        model: editProvider.model,
        temperature: editProvider.temperature ?? 0.7,
        maxTokens: editProvider.maxTokens ?? 2000,
        organization: editProvider.organization || '',
        isDefault: editProvider.isDefault
      })
    } else if (open && !editProvider) {
      // 添加模式，重置表单
      setFormData(defaultFormData)
    }
  }, [open, editProvider])

  const handleSave = async () => {
    // 添加模式必须填写 API Key
    if (!isEditMode && !formData.apiKey) {
      alert('请填写 API Key')
      return
    }
    if (!formData.model) {
      alert('请填写 Model')
      return
    }

    setLoading(true)
    try {
      if (isEditMode) {
        // 编辑模式
        const updateData: UpdateAiProviderData = {
          name: formData.name || null,
          provider: formData.provider,
          baseURL: formData.baseURL || null,
          model: formData.model,
          temperature: formData.temperature,
          maxTokens: formData.maxTokens,
          organization: formData.organization || null,
          isDefault: formData.isDefault
        }
        // 只有填写了 API Key 才更新
        if (formData.apiKey) {
          updateData.apiKey = formData.apiKey
        }

        logDebug('updateData', updateData)

        const result = await updateProvider(editProvider.id, updateData)
        if (result) {
          // 如果 isDefault 变化，需要重新加载列表
          if (formData.isDefault !== editProvider.isDefault) {
            await loadProviders()
          }
          onOpenChange(false)
        } else {
          alert('更新失败')
        }
      } else {
        // 添加模式
        const result = await createProvider(formData)
        if (result) {
          onOpenChange(false)
          setFormData(defaultFormData)
        } else {
          alert('创建失败')
        }
      }
    } catch (error) {
      alert(`操作失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '编辑 AI Model' : '添加 AI Model'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? '修改 AI 提供商配置' : '添加一个新的 AI 提供商配置'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* 名称 */}
          <div className="grid gap-2">
            <Label htmlFor="name">名称 (可选)</Label>
            <Input
              id="name"
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My OpenAI Config"
            />
          </div>

          {/* 提供商 */}
          <div className="grid gap-2">
            <Label htmlFor="provider">提供商</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  provider: value as CreateAiProviderData['provider']
                })
              }
            >
              <SelectTrigger id="provider" className="w-full">
                <SelectValue placeholder="选择提供商" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="grid gap-2">
            <Label htmlFor="apiKey">
              API Key {isEditMode ? '(留空不修改)' : '*'}
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder={isEditMode ? '留空不修改' : 'sk-...'}
              required={!isEditMode}
            />
          </div>

          {/* Base URL */}
          <div className="grid gap-2">
            <Label htmlFor="baseURL">Base URL (可选)</Label>
            <Input
              id="baseURL"
              type="text"
              value={formData.baseURL || ''}
              onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </div>

          {/* Model */}
          <div className="grid gap-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="gpt-3.5-turbo"
              required
            />
          </div>

          {/* Temperature */}
          <div className="grid gap-2">
            <Label htmlFor="temperature">Temperature: {formData.temperature}</Label>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[formData.temperature || 0.7]}
              onValueChange={([value]) => setFormData({ ...formData, temperature: value })}
            />
          </div>

          {/* Max Tokens */}
          <div className="grid gap-2">
            <Label htmlFor="maxTokens">Max Tokens</Label>
            <Input
              id="maxTokens"
              type="number"
              value={formData.maxTokens || 2000}
              onChange={(e) =>
                setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 2000 })
              }
            />
          </div>

          {/* Organization ID (仅 OpenAI) */}
          {formData.provider === 'openai' && (
            <div className="grid gap-2">
              <Label htmlFor="organization">Organization ID (可选)</Label>
              <Input
                id="organization"
                type="text"
                value={formData.organization || ''}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="org-..."
              />
            </div>
          )}

          {/* 设为默认 */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isDefault"
              checked={formData.isDefault || false}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isDefault: checked === true })
              }
            />
            <Label htmlFor="isDefault" className="cursor-pointer">
              设为默认提供商
            </Label>
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
