import { useEffect } from 'react'
import { Button } from '@renderer/components/ui/button'
import { IPC_CHANNELS, SUCCESS_CODE } from '@/common/constants/ipc'
import type { IPCResponse, SelectFilesResponse } from '@/types'
import { useRagStore } from '@renderer/stores/ragStore'

interface RagDocumentListProps {
  libraryId: bigint | null
  libraryName: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: '等待中',
  indexing: '索引中',
  ready: '可用',
  failed: '失败'
}

export const RagDocumentList: React.FC<RagDocumentListProps> = ({ libraryId, libraryName }) => {
  const {
    documentsByLibrary,
    loadDocuments,
    uploadDocument,
    deleteDocument,
    refreshDocument,
    refreshDocumentStatus,
    loadingDocuments
  } = useRagStore()

  useEffect(() => {
    if (libraryId) {
      loadDocuments(libraryId)
    }
  }, [libraryId, loadDocuments])

  const documents = libraryId ? documentsByLibrary[libraryId.toString()] || [] : []

  const handleUpload = async () => {
    if (!libraryId) return
    const response = (await window.electron.ipcRenderer.invoke(IPC_CHANNELS.file.select, {
      filters: [{ name: 'Documents', extensions: ['md', 'txt'] }],
      properties: ['openFile', 'multiSelections']
    })) as IPCResponse<SelectFilesResponse>

    if (response.code !== SUCCESS_CODE || !response.data?.files.length) {
      return
    }

    await Promise.all(
      response.data.files.map((file) =>
        uploadDocument({
          libraryId,
          filePath: file.path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.mimeType
        })
      )
    )
  }

  if (!libraryId) {
    return <div className="text-sm text-muted-foreground">请选择知识库以管理文档</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">文档管理</div>
          <div className="text-xs text-muted-foreground">当前知识库：{libraryName}</div>
        </div>
        <Button size="sm" onClick={handleUpload}>
          上传文档
        </Button>
      </div>

      {loadingDocuments && <div className="text-sm text-muted-foreground">加载中...</div>}
      {!loadingDocuments && documents.length === 0 && (
        <div className="text-sm text-muted-foreground">暂无文档</div>
      )}

      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="rounded-md border px-3 py-2 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{doc.fileName}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={doc.status === 'indexing'}
                  onClick={() => refreshDocument(libraryId, doc.id)}
                >
                  刷新文档
                </Button>
                {(doc.status === 'indexing' || doc.status === 'pending') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refreshDocumentStatus(libraryId, doc.id)}
                  >
                    刷新状态
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteDocument(libraryId, doc.id)}
                >
                  删除
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              状态：{STATUS_LABELS[doc.status] || doc.status}
            </div>
            {doc.errorMessage && (
              <div className="text-xs text-destructive">错误：{doc.errorMessage}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
