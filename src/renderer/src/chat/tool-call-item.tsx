import { Globe, FolderSearch, Loader2, CheckCircle2, XCircle, Wrench, Terminal } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import type { DbMessageWithAttachments } from '@/types'
import { cn } from '@renderer/lib/utils'

interface ToolCallItemProps {
  message: DbMessageWithAttachments
}

export function ToolCallItem({ message }: ToolCallItemProps) {
  // 使用分散的工具调用字段
  if (message.contentType !== 'tool_call' || !message.toolType) return null

  const toolType = message.toolType as 'web_search' | 'file_search' | 'terminal'
  const toolStatus = message.toolStatus as 'in_progress' | 'searching' | 'completed' | 'failed' | null
  const toolQuery = message.toolQuery || undefined

  // 终端工具特殊处理
  if (toolType === 'terminal') {
    return <TerminalToolCallItem message={message} />
  }

  // 获取工具图标组件
  const getToolIcon = () => {
    const iconClass = 'w-4 h-4'
    switch (toolType) {
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
    switch (toolStatus) {
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
    switch (toolType) {
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
    switch (toolStatus) {
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
      {toolQuery && (
        <div className="text-xs text-background/80 pt-1 border-t border-background/20">
          <span className="font-medium">查询：</span>
          <span className="ml-1">{toolQuery}</span>
        </div>
      )}
    </div>
  )

  // 获取状态图标（用于小图标显示）
  const statusIcon = () => {
    const iconClass = cn('w-3.5 h-3.5', getStatusColor())
    switch (toolStatus) {
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

/**
 * 终端工具调用组件
 */
function TerminalToolCallItem({ message }: { message: DbMessageWithAttachments }) {
  const command = message.toolQuery || ''
  const status = message.toolStatus as 'in_progress' | 'searching' | 'completed' | 'failed' | null
  
  // 获取状态图标
  const getStatusIcon = () => {
    const iconClass = cn('w-3.5 h-3.5')
    switch (status) {
      case 'in_progress':
      case 'searching':
        return <Loader2 className={cn(iconClass, 'animate-spin text-blue-500')} />
      case 'completed':
        return <CheckCircle2 className={cn(iconClass, 'text-green-500')} />
      case 'failed':
        return <XCircle className={cn(iconClass, 'text-red-500')} />
      default:
        return null
    }
  }

  // 获取状态文本
  const getStatusText = () => {
    switch (status) {
      case 'in_progress':
        return '执行中'
      case 'searching':
        return '执行中'
      case 'completed':
        return '已完成'
      case 'failed':
        return '失败'
      default:
        return ''
    }
  }

  return (
    <div className="tool-call-item bg-gray-50 dark:bg-gray-800 rounded-lg p-4 my-2 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Terminal className="w-4 h-4" />
        <span className="font-medium text-gray-900 dark:text-gray-100">
          终端命令
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          {getStatusIcon()}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {getStatusText()}
          </span>
        </div>
      </div>
      
      {command && (
        <div className="mt-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            命令：
          </div>
          <div className="bg-black text-green-400 font-mono text-sm p-3 rounded overflow-x-auto">
            {command}
          </div>
        </div>
      )}
      
      {status === 'completed' && message.content && (
        <div className="mt-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            输出：
          </div>
          <div className="bg-gray-900 text-gray-100 font-mono text-xs p-3 rounded overflow-x-auto max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{message.content}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
