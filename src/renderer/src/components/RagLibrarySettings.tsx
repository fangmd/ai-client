import { useEffect, useMemo, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { useRagStore } from '@renderer/stores/ragStore'
import { RagDocumentList } from '@renderer/components/rag/document-list'

export const RagLibrarySettings: React.FC = () => {
  const {
    libraries,
    selectedLibraryId,
    loadLibraries,
    createLibrary,
    renameLibrary,
    deleteLibrary,
    selectLibrary
  } = useRagStore()
  const [newName, setNewName] = useState('')

  useEffect(() => {
    loadLibraries()
  }, [loadLibraries])

  const selectedLibrary = useMemo(
    () => libraries.find((library) => library.id === selectedLibraryId) || null,
    [libraries, selectedLibraryId]
  )

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    await createLibrary(name)
    setNewName('')
  }

  const handleRename = async (id: bigint, currentName: string) => {
    const name = window.prompt('输入新的知识库名称', currentName)
    if (!name || !name.trim() || name.trim() === currentName) return
    await renameLibrary(id, name.trim())
  }

  const handleDelete = async (id: bigint) => {
    if (!window.confirm('确定删除该知识库？文档将被同步删除。')) return
    await deleteLibrary(id)
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-medium mb-4">知识库</h2>
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="新知识库名称"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            创建
          </Button>
        </div>

        <div className="space-y-2">
          {libraries.length === 0 && (
            <div className="text-sm text-muted-foreground">暂无知识库</div>
          )}
          {libraries.map((library) => (
            <div
              key={library.id}
              className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                selectedLibraryId === library.id ? 'border-primary bg-accent/40' : 'border-border'
              }`}
            >
              <button
                type="button"
                className="text-left text-sm font-medium flex-1"
                onClick={() => selectLibrary(library.id)}
              >
                {library.name}
              </button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRename(library.id, library.name)}
                >
                  重命名
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(library.id)}>
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>

        <RagDocumentList
          libraryId={selectedLibrary?.id ?? null}
          libraryName={selectedLibrary?.name ?? ''}
        />
      </div>
    </section>
  )
}
