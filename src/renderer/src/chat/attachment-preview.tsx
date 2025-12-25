import { X } from 'lucide-react'
import type { Attachment } from '@/types'
import { Button } from '@renderer/components/ui/button'

interface AttachmentPreviewProps {
  attachments: Attachment[]
  onRemove: (id: bigint) => void
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null

  return (
    <div className="flex gap-2 flex-wrap px-3 pb-2 w-full pt-1">
      {attachments.map((attachment) => (
        <div key={attachment.id.toString()} className="relative group">
          {attachment.type === 'image' && (
            <img
              src={`data:${attachment.mimeType};base64,${attachment.data}`}
              alt={attachment.name}
              className="w-16 h-16 object-cover rounded-lg border border-border"
            />
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
      ))}
    </div>
  )
}
