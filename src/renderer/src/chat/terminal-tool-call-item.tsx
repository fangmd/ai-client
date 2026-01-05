import { Loader2, CheckCircle2, XCircle, Terminal, ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@renderer/components/ui/collapsible'
import type { DbMessageWithAttachments } from '@/types'
import { cn } from '@renderer/lib/utils'
import { useState } from 'react'

interface TerminalToolCallItemProps {
  message: DbMessageWithAttachments
}

/**
 * 终端工具调用组件
 */
export function TerminalToolCallItem({ message }: TerminalToolCallItemProps) {
  const command = message.toolQuery || ''
  const status = message.toolStatus as 'in_progress' | 'searching' | 'completed' | 'failed' | null
  const [isOpen, setIsOpen] = useState(false)
  
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

  const hasContent = command || (status === 'completed' && message.content)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="tool-call-item bg-gray-50 dark:bg-gray-800 rounded-lg p-4 my-2 border border-gray-200 dark:border-gray-700">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Terminal className="w-4 h-4" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              终端命令
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              {getStatusIcon()}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {getStatusText()}
              </span>
              {hasContent && (
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200',
                    isOpen && 'transform rotate-180'
                  )}
                />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        {hasContent && (
          <CollapsibleContent>
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
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  )
}

