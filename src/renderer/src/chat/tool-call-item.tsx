import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { Message } from '@/types/chat-type'

interface ToolCallItemProps {
  message: Message
}

export function ToolCallItem({ message }: ToolCallItemProps) {
  const { toolCall } = message
  
  if (!toolCall) return null

  // 获取状态图标
  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'in_progress':
      case 'searching':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  // 获取工具图标
  const getToolIcon = () => {
    switch (toolCall.type) {
      case 'web_search':
        return '🔍'
      case 'file_search':
        return '📁'
      default:
        return '⚙️'
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
        return '准备中...'
      case 'searching':
        return '搜索中...'
      case 'completed':
        return '已完成'
      case 'failed':
        return '失败'
      default:
        return ''
    }
  }

  return (
    <div className="tool-call-item bg-muted/50 rounded-lg p-4 my-2 border border-border transition-all">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getToolIcon()}</span>
        <span className="font-medium text-foreground">
          {getToolName()}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          {getStatusIcon()}
          <span className="text-sm text-muted-foreground">
            {getStatusText()}
          </span>
        </div>
      </div>
      
      {toolCall.query && (
        <div className="mt-2 text-sm text-muted-foreground bg-background rounded p-2">
          <span className="font-medium">查询：</span>
          <span className="ml-1">{toolCall.query}</span>
        </div>
      )}
    </div>
  )
}

