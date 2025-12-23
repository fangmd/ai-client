import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger
} from '@renderer/components/ui/sidebar'
import { Plus } from 'lucide-react'
import { ChatSessionList } from '@renderer/components/ChatSessionList'

interface AppSidebarProps {
  onAddModel: () => void
  onNewChat: () => void
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ onAddModel, onNewChat }) => {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onAddModel} tooltip="添加 AI Model">
                  <Plus />
                  <span>添加 AI Model</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>对话</SidebarGroupLabel>
          <SidebarGroupContent>
            <ChatSessionList onNewChat={onNewChat} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}

