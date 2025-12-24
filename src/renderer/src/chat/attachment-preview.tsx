import { X } from 'lucide-react'
import type { Attachment } from '@/types/chat-type'

interface AttachmentPreviewProps {
  attachments: Attachment[]
  onRemove: (id: bigint) => void
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null

  return (
    <div className="flex gap-2 flex-wrap px-3 pb-2">
      {attachments.map((attachment) => (
        <div key={attachment.id.toString()} className="relative group">
          {attachment.type === 'image' && (
            <img
              src={`data:${attachment.mimeType};base64,${attachment.data}`}
              alt={attachment.name}
              className="w-16 h-16 object-cover rounded-lg border border-border"
            />
          )}
          <button
            type="button"
            onClick={() => onRemove(attachment.id)}
            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

