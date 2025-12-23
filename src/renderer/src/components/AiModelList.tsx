import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@renderer/components/ui/button'
import { AiModelDialog } from './AiModelDialog'
import { EmptyState } from './EmptyState'
import type { AiProvider } from '@/types/ai-provider-type'
import type { IPCResponse } from '@/types'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'
import { Plus, Trash2, Star, Bot, Pencil } from 'lucide-react'

// 提供商名称映射
const providerLabels: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  custom: 'Custom'
}

export const AiModelList: React.FC = () => {
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<AiProvider | undefined>(undefined)

  // 加载所有模型
  const loadProviders = useCallback(async () => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.list
      )) as IPCResponse<AiProvider[]>

      if (response.code === SUCCESS_CODE && response.data) {
        setProviders(response.data)
      }
    } catch (error) {
      console.error('Failed to load providers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  // 删除模型
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此模型吗？')) return

    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.delete,
        BigInt(id)
      )) as IPCResponse<null>

      if (response.code === SUCCESS_CODE) {
        loadProviders()
      } else {
        alert(`删除失败: ${response.msg}`)
      }
    } catch (error) {
      alert(`删除失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 设为默认
  const handleSetDefault = async (id: string) => {
    try {
      const response = (await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.aiProvider.setDefault,
        BigInt(id)
      )) as IPCResponse<AiProvider>

      if (response.code === SUCCESS_CODE) {
        loadProviders()
      } else {
        alert(`设置失败: ${response.msg}`)
      }
    } catch (error) {
      alert(`设置失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 打开添加对话框
  const handleOpenAddDialog = () => {
    setEditingProvider(undefined)
    setDialogOpen(true)
  }

  // 打开编辑对话框
  const handleEdit = (provider: AiProvider) => {
    setEditingProvider(provider)
    setDialogOpen(true)
  }

  // 对话框关闭时清除编辑状态
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingProvider(undefined)
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">大模型</h2>
        <Button size="sm" onClick={handleOpenAddDialog}>
          <Plus className="size-4" />
          添加模型
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        {loading && (
          <div className="p-8 text-center text-muted-foreground">加载中...</div>
        )}

        {!loading && providers.length === 0 && (
          <EmptyState
            icon={Bot}
            title="暂无模型"
            description="点击上方按钮添加一个模型开始使用"
          />
        )}

        {!loading && providers.length > 0 && (
          <div className="divide-y">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {provider.name || provider.model}
                    </span>
                    {provider.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                        <Star className="size-3 fill-current" />
                        默认
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <span>{providerLabels[provider.provider] || provider.provider}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="font-mono text-xs">{provider.model}</span>
                    {provider.temperature !== null && (
                      <>
                        <span className="text-muted-foreground/50">·</span>
                        <span>temp: {provider.temperature}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {!provider.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(provider.id.toString())}
                    >
                      设为默认
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleEdit(provider)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(provider.id.toString())}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AiModelDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSuccess={loadProviders}
        editProvider={editingProvider}
      />
    </section>
  )
}
