import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import {
  InputGroup,
  InputGroupButton,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea
} from '@renderer/components/ui/input-group'
import { Separator } from '@renderer/components/ui/separator'
import { IconCheck, IconInfoCircle, IconPlus } from '@tabler/icons-react'
import { ArrowUpIcon, RefreshCcw, Search } from 'lucide-react'
import { useState } from 'react'

interface Props {
  sendDisabled: boolean
  onSend: (content: string) => void
  resetChat: () => void
}

export const ChatInput: React.FC<Props> = ({ sendDisabled, onSend, resetChat }) => {
  const [content, setContent] = useState('')

  const handleSend = () => {
    onSend(content)
    setContent('')
    console.log('setContent')
  }

  return (
    <InputGroup>
      <InputGroupTextarea
        className="max-h-[300px]"
        placeholder="问一问"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
      />
      <InputGroupAddon align="block-end">
        {/* <InputGroupButton variant="outline" className="rounded-full" size="icon-xs">
          <IconPlus />
        </InputGroupButton> */}
        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <InputGroupButton variant="ghost">Auto</InputGroupButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="[--radius:0.95rem]">
            <DropdownMenuItem>Auto</DropdownMenuItem>
            <DropdownMenuItem>Agent</DropdownMenuItem>
            <DropdownMenuItem>Manual</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
        {/* <InputGroupText className="ml-auto">52% used</InputGroupText> */}
        <div className="ml-auto"></div>
        <InputGroupButton
          variant="outline"
          className="rounded-full"
          size="icon-xs"
          onClick={() => resetChat()}
        >
          <RefreshCcw />
          <span className="sr-only">reset</span>
        </InputGroupButton>
        <Separator orientation="vertical" className="!h-4" />
        <InputGroupButton
          variant="default"
          className="rounded-full"
          size="icon-xs"
          disabled={sendDisabled}
          onClick={() => handleSend()}
        >
          <ArrowUpIcon />
          <span className="sr-only">Send</span>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
