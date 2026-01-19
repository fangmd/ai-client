import {
  InputGroup,
  InputGroupButton,
  InputGroupAddon,
  InputGroupTextarea
} from '@renderer/components/ui/input-group'
import { Separator } from '@renderer/components/ui/separator'
import { ArrowUpIcon, Square, Paperclip } from 'lucide-react'
import { useState, useRef, type ChangeEvent } from 'react'
import type { AiProvider, Attachment } from '@/types'
import { ModelSelector } from './model-selector'
import { RagSelector } from '@renderer/components/rag/rag-selector'
import { AttachmentPreview } from './attachment-preview'
import { selectFiles, uploadFile, isAllowedImageType, logInfo } from '@renderer/utils'
import { MAX_FILE_SIZE, MAX_ATTACHMENTS } from '@/common/constants/file'
import type { UploadFileRequest } from '@/types'

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
  // 知识库选择相关
  currentSessionId?: bigint | null
  onLibraryChange?: (libraryId: bigint | null) => void
}

export const ChatInput: React.FC<Props> = ({
  sendDisabled,
  isSending,
  onSend,
  onStop,
  resetChat: _resetChat,
  providers = [],
  currentProviderId,
  onProviderChange,
  currentSessionId,
  onLibraryChange
}) => {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const handleSend = () => {
    if (isSending || sendDisabled || (!content.trim() && attachments.length === 0)) return
    onSend(content, attachments.length > 0 ? attachments : undefined)
    setContent('')
    setAttachments([])
  }

  const handleStop = () => {
    onStop()
  }

  const handleRemoveAttachment = (id: bigint) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleFileButtonClick = async () => {
    try {
      // 通过 IPC 调用主进程的文件选择对话框
      const selectRequest = {
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ],
        properties: ['openFile', 'multiSelections'] as Array<'openFile' | 'openDirectory' | 'multiSelections'>
      }
      const result = await selectFiles(selectRequest)

      if (result.files.length > 0) {
        for (const fileInfo of result.files) {
          // 验证文件类型
          if (!isAllowedImageType(fileInfo.mimeType || '')) {
            console.warn(`File type ${fileInfo.mimeType} is not allowed`)
            continue
          }

          // 验证文件大小
          if (fileInfo.size > MAX_FILE_SIZE) {
            console.warn(`File ${fileInfo.name} exceeds max size limit`)
            continue
          }

          // 检查附件数量限制
          if (attachments.length >= MAX_ATTACHMENTS) {
            console.warn('Max attachments limit reached')
            break
          }

          try {
            logInfo('Uploading file:', fileInfo)
            // 上传文件到主进程
            const uploadRequest: UploadFileRequest = {
              filePath: fileInfo.path,
              name: fileInfo.name,
              mimeType: fileInfo.mimeType || 'image/jpeg',
              size: fileInfo.size
            }
            const uploadResult = await uploadFile(uploadRequest)

            if (uploadResult) {
              const attachment: Attachment = {
                id: uploadResult.attachmentId,
                type: 'image',
                name: fileInfo.name,
                mimeType: fileInfo.mimeType || 'image/jpeg',
                size: fileInfo.size,
                path: uploadResult.path
              }
              setAttachments((prev) => [...prev, attachment])
            }
          } catch (error) {
            console.error('Failed to upload file:', error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to select files:', error)
    }
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

        {/* 知识库选择按钮 */}
        <RagSelector
          currentSessionId={currentSessionId}
          onLibraryChange={onLibraryChange}
        />

        {/* 文件上传按钮 */}
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
