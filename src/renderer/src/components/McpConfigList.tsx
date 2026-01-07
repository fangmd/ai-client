import React, { useState, useEffect } from 'react'
import { Button } from '@renderer/components/ui/button'
import { McpConfigDialog } from './McpConfigDialog'
import { EmptyState } from './EmptyState'
import type { McpServerConfig } from '@/types'
import { Plus, Trash2, Pencil, Server } from 'lucide-react'
import { useMcpConfigStore } from '@renderer/stores/mcp-config-store'
import { Checkbox } from '@renderer/components/ui/checkbox'

export const McpConfigList: React.FC = () => {
  const { configs, loading, deleteConfig, updateConfig, loadConfigs, error, clearError } =
    useMcpConfigStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<McpServerConfig | undefined>(undefined)

  // 组件挂载时加载配置
  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  // 显示错误提示
  useEffect(() => {
    if (error) {
      alert(error)
      clearError()
    }
  }, [error, clearError])

  // 删除配置
  const handleDelete = async (serverLabel: string) => {
    if (!confirm('确定要删除此 MCP 服务器配置吗？')) return

    try {
      await deleteConfig(serverLabel)
    } catch (err) {
      // 错误已在 store 中处理
    }
  }

  // 切换启用/禁用状态
  const handleToggleEnabled = async (config: McpServerConfig) => {
    try {
      await updateConfig({
        server_label: config.server_label,
        data: {
          enabled: !config.enabled
        }
      })
    } catch (err) {
      // 错误已在 store 中处理
    }
  }

  // 打开添加对话框
  const handleOpenAddDialog = () => {
    setEditingConfig(undefined)
    setDialogOpen(true)
  }

  // 打开编辑对话框
  const handleEdit = (config: McpServerConfig) => {
    setEditingConfig(config)
    setDialogOpen(true)
  }

  // 对话框关闭时清除编辑状态
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingConfig(undefined)
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium">MCP 服务器配置</h2>
          <p className="text-sm text-muted-foreground mt-1">
            配置 Model Context Protocol 服务器，让 AI 可以使用外部工具和资源
          </p>
        </div>
        <Button size="sm" onClick={handleOpenAddDialog}>
          <Plus className="size-4" />
          添加服务器
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        {loading && (
          <div className="p-8 text-center text-muted-foreground">加载中...</div>
        )}

        {!loading && configs.length === 0 && (
          <EmptyState
            icon={Server}
            title="暂无 MCP 服务器配置"
            description="点击上方按钮添加一个 MCP 服务器配置"
          />
        )}

        {!loading && configs.length > 0 && (
          <div className="divide-y">
            {configs.map((config) => (
              <div
                key={config.server_label}
                className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{config.server_label}</span>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={config.enabled !== false}
                        onCheckedChange={() => handleToggleEnabled(config)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {config.enabled !== false ? '已启用' : '已禁用'}
                      </span>
                    </div>
                  </div>
                  {config.server_description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {config.server_description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {config.server_url}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(config)}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(config.server_label)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <McpConfigDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        editConfig={editingConfig}
      />
    </section>
  )
}

