import { Streamdown } from 'streamdown'
// import remarkGfm from 'remark-gfm'
// import { components } from './markdown-viewer'
import clsx from 'clsx'
import { Check, Copy } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import copy from 'copy-to-clipboard'
import { useState } from 'react'
import type { DbMessageWithAttachments } from '@/types'
import { ToolCallItem } from './tool-call-item'
interface Props {
  message: DbMessageWithAttachments
}

export const MessageItem: React.FC<Props> = ({ message }) => {
  const [isCopied, setIsCopied] = useState(false)

  // logDebug('【MessageItem】message:', message)
  
  // 工具调用消息
  if (message.contentType === 'tool_call') {
    return <ToolCallItem message={message} />
  }
  
  if (message.role === 'assistant') {
    return (
      <div className={clsx('markdown-body', 'pb-[20px] w-full')} key={message.id}>
        {/* remarkPlugins={[remarkGfm]} components={components as any} */}
        <Streamdown isAnimating={message.status === 'sending'}>{message.content}</Streamdown>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div className="group">
        <div className="flex flex-col items-end pt-[20px] gap-2">
          {/* 显示附件图片 */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex gap-2 flex-wrap justify-end max-w-[80%]">
              {message.attachments.map((attachment) =>
                attachment.type === 'image' ? (
                  <img
                    key={attachment.id.toString()}
                    src={`data:${attachment.mimeType};base64,${attachment.data}`}
                    alt={attachment.name}
                    className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                  />
                ) : null
              )}
            </div>
          )}
          {/* 显示文本内容 */}
          {message.content && (
            <div className="bg-msg-bg rounded-[16px] px-[16px] py-[4px]">{message.content}</div>
          )}
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
