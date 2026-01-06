import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useChatStore } from '@renderer/stores/chatStore'
import type { IpcChatSession } from '@/types'
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@renderer/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Trash2, Plus, MoreVertical } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { logDebug } from '@renderer/utils'

interface ChatSessionListProps {
  onNewChat: () => void
}

export const ChatSessionList: React.FC<ChatSessionListProps> = ({ onNewChat }) => {
  const navigate = useNavigate()
  const location = useLocation()

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

  const navigateToChat = () => {
    if (location.pathname !== '/') {
      navigate('/')
    }
  }

  const handleSelectSession = (session: IpcChatSession) => {
    const startTime = performance.now()
    logDebug('[SessionSwitch] handleSelectSession start', {
      sessionId: String(session.id),
      sessionTitle: session.title,
      currentSessionId: currentSessionId ? String(currentSessionId) : null,
      timestamp: new Date().toISOString()
    })

    if (session.id !== currentSessionId) {
      // 如果正在处理流式消息，先停止
      if (isSending) {
        const stopStartTime = performance.now()
        logDebug('[SessionSwitch] stopStream start')
        stopStream()
        logDebug('[SessionSwitch] stopStream end', {
          duration: `${(performance.now() - stopStartTime).toFixed(2)}ms`
        })
      }

      const setSessionStartTime = performance.now()
      logDebug('[SessionSwitch] setCurrentSession start', {
        sessionId: String(session.id)
      })
      setCurrentSession(session.id)
      logDebug('[SessionSwitch] setCurrentSession end', {
        sessionId: String(session.id),
        duration: `${(performance.now() - setSessionStartTime).toFixed(2)}ms`
      })
    } else {
      logDebug('[SessionSwitch] session already selected, skipping setCurrentSession')
    }

    const navigateStartTime = performance.now()
    logDebug('[SessionSwitch] navigateToChat start', {
      currentPath: location.pathname
    })
    navigateToChat()
    logDebug('[SessionSwitch] navigateToChat end', {
      duration: `${(performance.now() - navigateStartTime).toFixed(2)}ms`
    })

    logDebug('[SessionSwitch] handleSelectSession end', {
      sessionId: String(session.id),
      totalDuration: `${(performance.now() - startTime).toFixed(2)}ms`
    })
  }

  const handleNewChat = () => {
    onNewChat()
    navigateToChat()
  }

  const handleDeleteSession = async (sessionId: bigint) => {
    await deleteSession(sessionId)
  }

  return (
    <SidebarMenu>
      {/* 新建对话按钮 */}
      <SidebarMenuItem>
        <SidebarMenuButton onClick={handleNewChat} tooltip="新建对话">
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
            className={cn('group flex items-center gap-2', session.id === currentSessionId && 'bg-accent')}
          >
            <span className="flex-1 min-w-0 truncate text-left">{session.title}</span>
            {/* 更多菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDeleteSession(session.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>删除对话</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
