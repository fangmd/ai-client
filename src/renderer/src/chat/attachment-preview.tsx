import { X } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Attachment } from '@/types'
import { Button } from '@renderer/components/ui/button'
import { getFileDataUri } from '@renderer/utils/file'
import { logDebug, logError } from '@renderer/utils'

interface AttachmentPreviewProps {
  attachments: Attachment[]
  onRemove: (id: bigint) => void
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null

  return (
    <div className="flex gap-2 flex-wrap px-3 pb-2 w-full pt-1">
      {attachments.map((attachment) => (
        <AttachmentPreviewItem
          key={attachment.id.toString()}
          attachment={attachment}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

const AttachmentPreviewItem: React.FC<{
  attachment: Attachment
  onRemove: (id: bigint) => void
}> = ({ attachment, onRemove }) => {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    logDebug('AttachmentPreviewItem', 'attachment', attachment)
    if (attachment.path && attachment.type === 'image') {
      setLoading(true)
      getFileDataUri(attachment.path, attachment.mimeType)
        .then((src) => {
          // logDebug('AttachmentPreviewItem', 'src', src)
          setImageSrc(src)
          setLoading(false)
        })
        .catch((err) => {
          // logError('AttachmentPreviewItem', 'error', err)
          setLoading(false)
        })
    }
  }, [attachment.path, attachment.mimeType, attachment.type])

  return (
    <div className="relative group">
      {attachment.type === 'image' && (
        <>
          {loading ? (
            <div className="w-16 h-16 object-cover rounded-lg border border-border bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">加载中</span>
            </div>
          ) : imageSrc ? (
            <img
              src={imageSrc}
              alt={attachment.name}
              className="w-16 h-16 object-cover rounded-lg border border-border"
            />
          ) : (
            <div className="w-16 h-16 object-cover rounded-lg border border-border bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">加载失败</span>
            </div>
          )}
        </>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(attachment.id)}
        className="absolute top-1 right-1 size-5 rounded-full opacity-0 group-hover:opacity-100 "
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}
