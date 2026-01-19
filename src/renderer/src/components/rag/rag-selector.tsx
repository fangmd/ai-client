import { useEffect } from 'react'
import { useRagStore } from '@renderer/stores/ragStore'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'

export const RagSelector: React.FC = () => {
  const { libraries, selectedLibraryId, loadLibraries, selectLibrary } = useRagStore()

  useEffect(() => {
    loadLibraries()
  }, [loadLibraries])

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">知识库</span>
      <Select
        value={selectedLibraryId ? selectedLibraryId.toString() : 'none'}
        onValueChange={(value) => {
          if (value === 'none') {
            selectLibrary(null)
          } else {
            selectLibrary(BigInt(value))
          }
        }}
      >
        <SelectTrigger className="min-w-[200px]">
          <SelectValue placeholder="选择知识库" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">不使用知识库</SelectItem>
          {libraries.map((library) => (
            <SelectItem key={library.id} value={String(library.id)}>
              {library.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
