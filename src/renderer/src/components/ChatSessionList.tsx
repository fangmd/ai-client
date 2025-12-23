import { useEffect } from 'react'
import { useChatStore, type ChatSession } from '@renderer/stores/chatStore'
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@renderer/components/ui/sidebar'
import { Trash2, Plus } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface ChatSessionListProps {
  onNewChat: () => void
}

export const ChatSessionList: React.FC<ChatSessionListProps> = ({ onNewChat }) => {
  const {
    sessions,
    currentSessionId,
    loadingSessions,
    loadSessions,
    setCurrentSession,
    deleteSession,
    isSending,
    stopStream
  } = useChatStore()

  // 初始化时加载会话列表
  useEffect(() => {
    loadSessions()
  }, [])

  const handleSelectSession = (session: ChatSession) => {
    if (session.id !== currentSessionId) {
      // 如果正在处理流式消息，先停止
      if (isSending) {
        stopStream()
      }
      setCurrentSession(session.id)
    }
  }

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: bigint) => {
    e.stopPropagation()
    await deleteSession(sessionId)
  }

  return (
    <SidebarMenu>
      {/* 新建对话按钮 */}
      <SidebarMenuItem>
        <SidebarMenuButton onClick={onNewChat} tooltip="新建对话">
          <Plus className="h-4 w-4" />
          <span>新建对话</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* 加载状态 */}
      {loadingSessions && (
        <SidebarMenuItem>
          <div className="px-2 py-1 text-sm text-muted-foreground">加载中...</div>
        </SidebarMenuItem>
      )}

      {/* 会话列表 */}
      {!loadingSessions && sessions.length === 0 && (
        <SidebarMenuItem>
          <div className="px-2 py-1 text-sm text-muted-foreground">暂无对话</div>
        </SidebarMenuItem>
      )}

      {sessions.map((session) => (
        <SidebarMenuItem key={String(session.id)}>
          <SidebarMenuButton
            onClick={() => handleSelectSession(session)}
            isActive={session.id === currentSessionId}
            tooltip={session.title}
            className={cn('group relative', session.id === currentSessionId && 'bg-accent')}
          >
            <div className="flex-1 min-w-0 flex flex-col items-start">
              <span className="truncate w-full text-left">{session.title}</span>
            </div>
            {/* 删除按钮 - 悬浮时显示 */}
            <button
              onClick={(e) => handleDeleteSession(e, session.id)}
              className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
              title="删除对话"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
