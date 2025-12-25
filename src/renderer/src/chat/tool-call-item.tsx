import { Globe, FolderSearch, Loader2, CheckCircle2, XCircle, Wrench } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import type { Message } from '@/types/chat-type'
import { cn } from '@renderer/lib/utils'

interface ToolCallItemProps {
  message: Message
}

export function ToolCallItem({ message }: ToolCallItemProps) {
  const { toolCall } = message

  if (!toolCall) return null

  // 获取工具图标组件
  const getToolIcon = () => {
    const iconClass = 'w-4 h-4'
    switch (toolCall.type) {
      case 'web_search':
        return <Globe className={iconClass} />
      case 'file_search':
        return <FolderSearch className={iconClass} />
      default:
        return <Wrench className={iconClass} />
    }
  }

  // 获取状态颜色
  const getStatusColor = () => {
    switch (toolCall.status) {
      case 'in_progress':
      case 'searching':
        return 'text-blue-500'
      case 'completed':
        return 'text-green-500'
      case 'failed':
        return 'text-red-500'
      default:
        return 'text-muted-foreground'
    }
  }

  // 获取工具名称
  const getToolName = () => {
    switch (toolCall.type) {
      case 'web_search':
        return '网络搜索'
      case 'file_search':
        return '文件搜索'
      default:
        return '工具调用'
    }
  }

  // 获取状态文本
  const getStatusText = () => {
    switch (toolCall.status) {
      case 'in_progress':
        return '准备中'
      case 'searching':
        return '搜索中'
      case 'completed':
        return '已完成'
      case 'failed':
        return '失败'
      default:
        return ''
    }
  }

  // 构建 Tooltip 内容
  const tooltipContent = (
    <div className="space-y-1.5 max-w-xs">
      <div className="flex items-center gap-2">
        {getToolIcon()}
        <span className="font-medium text-background">{getToolName()}</span>
        <span className={cn('text-xs', getStatusColor())}>{getStatusText()}</span>
      </div>
      {toolCall.query && (
        <div className="text-xs text-background/80 pt-1 border-t border-background/20">
          <span className="font-medium">查询：</span>
          <span className="ml-1">{toolCall.query}</span>
        </div>
      )}
    </div>
  )

  // 获取状态图标（用于小图标显示）
  const statusIcon = () => {
    const iconClass = cn('w-3.5 h-3.5', getStatusColor())
    switch (toolCall.status) {
      case 'in_progress':
      case 'searching':
        return <Loader2 className={cn(iconClass, 'animate-spin')} />
      case 'completed':
        return <CheckCircle2 className={iconClass} />
      case 'failed':
        return <XCircle className={iconClass} />
      default:
        return null
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-default">
          {getToolIcon()}
          {statusIcon()}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  )
}
