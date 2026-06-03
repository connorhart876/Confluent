import { useEffect, useState } from 'react'
import type { KnowledgeBaseEntry, SetupType, IpcResult } from '@shared/ipc-types'
import { KbList } from '@renderer/components/knowledge-base/kb-list'
import { KbEditor } from '@renderer/components/knowledge-base/kb-editor'
import { toast } from '@renderer/components/ui/use-toast'

type View = 'list' | 'editor'

export function KnowledgeBasePage(): JSX.Element {
  const [view, setView] = useState<View>('list')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([])
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([])
  const [loading, setLoading] = useState(true)

  const loadEntries = (): void => {
    void window.api.knowledgeBase
      .list()
      .then((raw) => {
        const result = raw as IpcResult<KnowledgeBaseEntry[]>
        if (result.success) setEntries(result.data)
        else toast({ variant: 'destructive', title: 'Failed to load entries', description: result.error })
      })
      .catch(() => toast({ variant: 'destructive', title: 'Failed to load entries' }))
  }

  useEffect(() => {
    const setupTypePromise = window.api.setupType
      .list()
      .then((raw) => {
        const result = raw as IpcResult<SetupType[]>
        if (result.success) setSetupTypes(result.data)
        else toast({ variant: 'destructive', title: 'Failed to load setup types', description: result.error })
      })
      .catch(() => toast({ variant: 'destructive', title: 'Failed to load setup types' }))

    const entriesPromise = window.api.knowledgeBase
      .list()
      .then((raw) => {
        const result = raw as IpcResult<KnowledgeBaseEntry[]>
        if (result.success) setEntries(result.data)
        else toast({ variant: 'destructive', title: 'Failed to load entries', description: result.error })
      })
      .catch(() => toast({ variant: 'destructive', title: 'Failed to load entries' }))

    void Promise.all([setupTypePromise, entriesPromise]).finally(() => setLoading(false))
  }, [])

  const openNew = (): void => {
    setSelectedId(null)
    setView('editor')
  }

  const openEntry = (id: number): void => {
    setSelectedId(id)
    setView('editor')
  }

  const handleBack = (): void => {
    setView('list')
    setSelectedId(null)
  }

  const handleSaved = (): void => {
    loadEntries()
    setView('list')
    setSelectedId(null)
  }

  const handleDeleted = (): void => {
    loadEntries()
    setView('list')
    setSelectedId(null)
  }

  const selectedEntry = selectedId !== null ? (entries.find((e) => e.id === selectedId) ?? null) : null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Knowledge Base</h1>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : view === 'list' ? (
        <KbList
          entries={entries}
          setupTypes={setupTypes}
          onSelect={openEntry}
          onNew={openNew}
        />
      ) : (
        <KbEditor
          key={selectedId ?? 'new'}
          entryId={selectedId}
          initialEntry={selectedEntry}
          setupTypes={setupTypes}
          onBack={handleBack}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
