import { Streamdown } from 'streamdown'
import clsx from 'clsx'
import { Check, Copy } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import copy from 'copy-to-clipboard'
import { useState, useEffect } from 'react'
import type { DbMessageWithAttachments, Attachment } from '@/types'
import { ToolCallItem } from './tool-call-item'
import { getFileDataUri } from '@renderer/utils/file'
import { logDebug, logError } from '@renderer/utils'
interface Props {
  message: DbMessageWithAttachments
}

export const MessageItem: React.FC<Props> = ({ message }) => {
  const [isCopied, setIsCopied] = useState(false)

  // logDebug('[MessageItem] message:', message)

  // 工具调用消息
  if (message.contentType === 'tool_call') {
    return <ToolCallItem message={message} />
  }

  if (message.role === 'assistant') {
    return (
      <div className="group overflow-hidden" key={message.id}>
        <div className={clsx('markdown-body', 'w-full overflow-hidden')}>
          <Streamdown isAnimating={message.status === 'sending'}>{message.content}</Streamdown>
        </div>
        <div className="flex justify-start ml-2 py-1 opacity-0 pointer-events-none transition-opacity delay-[2000ms] group-hover:opacity-100 group-hover:pointer-events-auto group-hover:delay-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy"
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

  if (message.role === 'user') {
    return (
      <div className="group overflow-hidden">
        <div className="flex flex-col items-end pt-[20px] gap-2">
          {/* 显示附件图片 */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex gap-2 flex-wrap justify-end max-w-[80%]">
              {message.attachments.map((attachment) =>
                attachment.type === 'image' ? (
                  <AttachmentImage key={attachment.id.toString()} attachment={attachment} />
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

/**
 * 附件图片组件（异步加载）
 */
const AttachmentImage: React.FC<{ attachment: Attachment }> = ({ attachment }) => {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // logDebug('[AttachmentImage] attachment', attachment)
    if (attachment.path) {
      setLoading(true)
      setError(false)
      getFileDataUri(attachment.path, attachment.mimeType)
        .then((src) => {
          // logDebug('[AttachmentImage] src', src)
          setImageSrc(src)
          setLoading(false)
        })
        .catch((err) => {
          // logError('[AttachmentImage] error', err)
          setError(true)
          setLoading(false)
        })
    }
  }, [attachment.path, attachment.mimeType])

  if (loading) {
    return (
      <div className="max-w-[200px] max-h-[200px] rounded-lg bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground">加载中...</span>
      </div>
    )
  }

  if (error || !imageSrc) {
    return (
      <div className="max-w-[200px] max-h-[200px] rounded-lg bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground">加载失败</span>
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={attachment.name}
      className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
    />
  )
}
