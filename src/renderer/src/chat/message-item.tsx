import { Streamdown } from 'streamdown'
import remarkGfm from 'remark-gfm'
import { components } from './markdown-viewer'
import clsx from 'clsx'
import { Check, Copy } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import copy from 'copy-to-clipboard'
import { useState } from 'react'
import { Message } from '@renderer/types/chat'

interface Props {
  message: Message
}

export const MessageItem: React.FC<Props> = ({ message }) => {
  const [isCopied, setIsCopied] = useState(false)
  if (message.role === 'assistant') {
    return (
      <div className={clsx('markdown-body', 'pb-[20px] w-full')} key={message.id}>
        <Streamdown remarkPlugins={[remarkGfm]} components={components as any}>
          {message.content}
        </Streamdown>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div className="group">
        <div className="flex  justify-end pt-[20px]">
          <div className="bg-msg-bg rounded-[16px] px-[16px] py-[4px]">{message.content}</div>
        </div>
        <div className="flex justify-end mr-2 py-1 opacity-0 pointer-events-none transition-opacity delay-[2000ms] group-hover:opacity-100 group-hover:pointer-events-auto group-hover:delay-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Submit"
            onClick={() => {
              copy(message.content)
              setIsCopied(true)
              setTimeout(() => {
                setIsCopied(false)
              }, 2000)
            }}
          >
            {isCopied ? <Check /> : <Copy />}
          </Button>
        </div>
      </div>
    )
  }

  return <div></div>
}
