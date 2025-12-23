import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  className = ''
}) => {
  return (
    <div className={`p-8 text-center text-muted-foreground ${className}`}>
      <Icon className="size-12 mx-auto mb-3 opacity-50" />
      <p>{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  )
}

