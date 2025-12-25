import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import type { AiProvider } from '@/types'

interface Props {
  providers: AiProvider[]
  currentProviderId?: bigint | null
  onProviderChange?: (providerId: bigint) => void
}

export const ModelSelector: React.FC<Props> = ({
  providers,
  currentProviderId,
  onProviderChange
}) => {
  if (providers.length === 0) return null

  return (
    <Select
      value={currentProviderId?.toString() ?? ''}
      onValueChange={(value) => onProviderChange?.(BigInt(value))}
    >
      <SelectTrigger
        size="sm"
        className="w-auto border-none shadow-none bg-transparent hover:bg-muted/50"
      >
        <SelectValue placeholder="选择模型" />
      </SelectTrigger>
      <SelectContent>
        {providers.map((p) => (
          <SelectItem key={p.id.toString()} value={p.id.toString()}>
            {p.name || p.model}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
