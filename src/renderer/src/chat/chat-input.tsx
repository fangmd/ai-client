import {
  InputGroup,
  InputGroupButton,
  InputGroupAddon,
  InputGroupTextarea
} from '@renderer/components/ui/input-group'
import { Separator } from '@renderer/components/ui/separator'
import { ArrowUpIcon, Square, Paperclip } from 'lucide-react'
import { useState, useRef, type ChangeEvent } from 'react'
import type { AiProvider } from '@/types/ai-provider-type'
import type { Attachment } from '@/types/chat-type'
import { ModelSelector } from './model-selector'
import { AttachmentPreview } from './attachment-preview'
import { readFileAsBase64, isAllowedImageType, generateTempId } from '@renderer/utils'
import { MAX_FILE_SIZE, MAX_ATTACHMENTS, IMAGE_ACCEPT } from '@/common/constants/file'

interface Props {
  sendDisabled: boolean
  isSending: boolean
  onSend: (content: string, attachments?: Attachment[]) => void
  onStop: () => void
  resetChat: () => void
  // 模型选择相关
  providers?: AiProvider[]
  currentProviderId?: bigint | null
  onProviderChange?: (providerId: bigint) => void
}

export const ChatInput: React.FC<Props> = ({
  sendDisabled,
  isSending,
  onSend,
  onStop,
  resetChat: _resetChat,
  providers = [],
  currentProviderId,
  onProviderChange
}) => {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (isSending || sendDisabled || (!content.trim() && attachments.length === 0)) return
    onSend(content, attachments.length > 0 ? attachments : undefined)
    setContent('')
    setAttachments([])
  }

  const handleStop = () => {
    onStop()
  }

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    for (const file of files) {
      // 验证文件类型
      if (!isAllowedImageType(file.type)) {
        console.warn(`File type ${file.type} is not allowed`)
        continue
      }

      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`File ${file.name} exceeds max size limit`)
        continue
      }

      // 检查附件数量限制
      if (attachments.length >= MAX_ATTACHMENTS) {
        console.warn('Max attachments limit reached')
        break
      }

      try {
        // 读取为 Base64
        const data = await readFileAsBase64(file)

        const attachment: Attachment = {
          id: generateTempId(),
          type: 'image',
          name: file.name,
          mimeType: file.type,
          size: file.size,
          data
        }

        setAttachments((prev) => [...prev, attachment])
      } catch (error) {
        console.error('Failed to read file:', error)
      }
    }

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = (id: bigint) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  const canSend = content.trim() || attachments.length > 0

  return (
    <InputGroup className="bg-background">
      {/* 附件预览 */}
      <AttachmentPreview attachments={attachments} onRemove={handleRemoveAttachment} />

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
        <ModelSelector
          providers={providers}
          currentProviderId={currentProviderId}
          onProviderChange={onProviderChange}
        />

        {/* 文件上传按钮 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <InputGroupButton
          variant="ghost"
          size="icon-xs"
          onClick={handleFileButtonClick}
          disabled={isSending || attachments.length >= MAX_ATTACHMENTS}
          title="上传图片"
        >
          <Paperclip className="h-4 w-4" />
          <span className="sr-only">Upload</span>
        </InputGroupButton>

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
            disabled={sendDisabled || !canSend}
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
