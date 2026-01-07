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
import { Textarea } from '@renderer/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import type { McpServerConfig, CreateMcpConfigRequest } from '@/types'
import { useMcpConfigStore } from '@renderer/stores/mcp-config-store'

interface McpConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editConfig?: McpServerConfig // 编辑模式：传入要编辑的配置
}

// 默认表单数据
const defaultFormData: CreateMcpConfigRequest = {
  server_label: '',
  server_description: '',
  server_url: '',
  require_approval: 'never',
  enabled: true
}

export const McpConfigDialog: React.FC<McpConfigDialogProps> = ({
  open,
  onOpenChange,
  editConfig
}) => {
  const { createConfig, updateConfig } = useMcpConfigStore()
  const isEditMode = !!editConfig
  const [formData, setFormData] = useState<CreateMcpConfigRequest>(defaultFormData)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 编辑模式下，填充现有数据
  useEffect(() => {
    if (open && editConfig) {
      setFormData({
        server_label: editConfig.server_label,
        server_description: editConfig.server_description || '',
        server_url: editConfig.server_url,
        require_approval: editConfig.require_approval || 'never',
        enabled: editConfig.enabled !== false
      })
    } else if (open && !editConfig) {
      // 添加模式，重置表单
      setFormData(defaultFormData)
    }
    setErrors({})
  }, [open, editConfig])

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.server_label.trim()) {
      newErrors.server_label = '服务器标签为必填项'
    }

    if (!formData.server_url.trim()) {
      newErrors.server_url = '服务器 URL 为必填项'
    } else {
      // 验证 URL 格式
      try {
        new URL(formData.server_url)
      } catch {
        newErrors.server_url = '无效的 URL 格式'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      if (isEditMode) {
        // 编辑模式
        await updateConfig({
          server_label: editConfig.server_label,
          data: {
            server_description: formData.server_description || undefined,
            server_url: formData.server_url,
            require_approval: formData.require_approval,
            enabled: formData.enabled
          }
        })
      } else {
        // 添加模式
        await createConfig(formData)
      }
      onOpenChange(false)
    } catch (error) {
      // 错误已在 store 中处理
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '编辑 MCP 服务器' : '添加 MCP 服务器'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? '修改 MCP 服务器配置'
              : '添加一个新的 MCP 服务器配置，让 AI 可以使用其提供的工具和资源'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* 服务器标签 */}
          <div className="grid gap-2">
            <Label htmlFor="server_label">
              服务器标签 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="server_label"
              value={formData.server_label}
              onChange={(e) =>
                setFormData({ ...formData, server_label: e.target.value })
              }
              placeholder="例如: time-mcp"
              disabled={isEditMode} // 编辑模式下不允许修改标签
              className={errors.server_label ? 'border-destructive' : ''}
            />
            {errors.server_label && (
              <p className="text-sm text-destructive">{errors.server_label}</p>
            )}
          </div>

          {/* 服务器 URL */}
          <div className="grid gap-2">
            <Label htmlFor="server_url">
              服务器 URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="server_url"
              value={formData.server_url}
              onChange={(e) => setFormData({ ...formData, server_url: e.target.value })}
              placeholder="例如: http://localhost:10010/mcp"
              className={errors.server_url ? 'border-destructive' : ''}
            />
            {errors.server_url && (
              <p className="text-sm text-destructive">{errors.server_url}</p>
            )}
          </div>

          {/* 服务器描述 */}
          <div className="grid gap-2">
            <Label htmlFor="server_description">服务器描述（可选）</Label>
            <Textarea
              id="server_description"
              value={formData.server_description}
              onChange={(e) =>
                setFormData({ ...formData, server_description: e.target.value })
              }
              placeholder="描述此 MCP 服务器的功能"
              rows={3}
            />
          </div>

          {/* 需要审批 */}
          <div className="grid gap-2">
            <Label htmlFor="require_approval">工具调用审批</Label>
            <Select
              value={formData.require_approval}
              onValueChange={(value: 'always' | 'never') =>
                setFormData({ ...formData, require_approval: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">不需要审批</SelectItem>
                <SelectItem value="always">总是需要审批</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 启用状态 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled !== false}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="size-4"
            />
            <Label htmlFor="enabled" className="cursor-pointer">
              启用此服务器
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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

