import { useEffect } from 'react'
import { useRagStore } from '@renderer/stores/ragStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { InputGroupButton } from '@renderer/components/ui/input-group'
import { BookOpen, Check } from 'lucide-react'

interface RagSelectorProps {
  currentSessionId?: bigint | null
  onLibraryChange?: (libraryId: bigint | null) => void
}

export const RagSelector: React.FC<RagSelectorProps> = ({
  currentSessionId,
  onLibraryChange
}) => {
  const { libraries, selectedLibraryId, loadLibraries, selectLibrary } = useRagStore()

  useEffect(() => {
    loadLibraries()
  }, [loadLibraries])

  const selectedLibrary = libraries.find((lib) => lib.id === selectedLibraryId)

  const handleSelect = (libraryId: bigint | null) => {
    selectLibrary(libraryId)
    onLibraryChange?.(libraryId)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          variant="ghost"
          size="icon-xs"
          title={selectedLibrary ? `知识库: ${selectedLibrary.name}` : '选择知识库'}
          className={selectedLibraryId ? 'text-primary' : ''}
        >
          <BookOpen className={`h-4 w-4 ${selectedLibraryId ? 'fill-current' : ''}`} />
          <span className="sr-only">知识库</span>
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => handleSelect(null)}
          className={selectedLibraryId === null ? 'bg-accent' : ''}
        >
          {selectedLibraryId === null && <Check className="h-4 w-4 mr-2" />}
          {selectedLibraryId !== null && <span className="w-4 mr-2" />}
          不使用知识库
        </DropdownMenuItem>
        {libraries.map((library) => (
          <DropdownMenuItem
            key={library.id}
            onClick={() => handleSelect(library.id)}
            className={selectedLibraryId === library.id ? 'bg-accent' : ''}
          >
            {selectedLibraryId === library.id && <Check className="h-4 w-4 mr-2" />}
            {selectedLibraryId !== library.id && <span className="w-4 mr-2" />}
            {library.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
