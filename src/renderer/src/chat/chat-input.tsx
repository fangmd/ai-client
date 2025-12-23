import {
  InputGroup,
  InputGroupButton,
  InputGroupAddon,
  InputGroupTextarea
} from '@renderer/components/ui/input-group'
import { Separator } from '@renderer/components/ui/separator'
import { ArrowUpIcon, Square } from 'lucide-react'
import { useState } from 'react'

interface Props {
  sendDisabled: boolean
  isSending: boolean
  onSend: (content: string) => void
  onStop: () => void
  resetChat: () => void
}

export const ChatInput: React.FC<Props> = ({
  sendDisabled,
  isSending,
  onSend,
  onStop,
  resetChat
}) => {
  const [content, setContent] = useState('')

  const handleSend = () => {
    if (isSending || sendDisabled || !content.trim()) return
    onSend(content)
    setContent('')
  }

  const handleStop = () => {
    onStop()
  }

  return (
    <InputGroup className="bg-background">
      <InputGroupTextarea
        className="max-h-[300px]"
        placeholder="问一问"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          // 中文输入法组合状态时，Enter 用于选择候选词，不发送消息
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            handleSend()
          }
        }}
      />
      <InputGroupAddon align="block-end">
        <div className="ml-auto"></div>
        <Separator orientation="vertical" className="h-4!" />
        {isSending ? (
          <InputGroupButton
            variant="outline"
            className="rounded-full"
            size="icon-xs"
            onClick={handleStop}
          >
            <Square className="h-3 w-3 fill-current text-foreground" />
            <span className="sr-only">Stop</span>
          </InputGroupButton>
        ) : (
          <InputGroupButton
            variant="default"
            className="rounded-full"
            size="icon-xs"
            disabled={sendDisabled || !content.trim()}
            onClick={handleSend}
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        )}
      </InputGroupAddon>
    </InputGroup>
  )
}
