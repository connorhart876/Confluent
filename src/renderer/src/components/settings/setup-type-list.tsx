import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import type { SetupType, IpcResult } from '@shared/ipc-types'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { toast } from '@renderer/components/ui/use-toast'
import { cn } from '@renderer/lib/utils'

const MAX_NAME_LENGTH = 50

export function SetupTypeList(): JSX.Element {
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const load = (): void => {
    window.api.setupType
      .list()
      .then((raw) => {
        const result = raw as IpcResult<SetupType[]>
        if (result.success) setSetupTypes(result.data)
        else toast({ variant: 'destructive', title: 'Failed to load setup types', description: result.error })
      })
      .catch(() => toast({ variant: 'destructive', title: 'Failed to load setup types' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus()
  }, [editingId])

  const handleAdd = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      const result = await window.api.setupType.create({ name }) as IpcResult<SetupType>
      if (result.success) {
        toast({ title: `"${result.data.name}" added` })
        setNewName('')
        load()
      } else {
        toast({ variant: 'destructive', title: 'Could not add setup type', description: result.error })
      }
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (st: SetupType): void => {
    setEditingId(st.id)
    setEditName(st.name)
  }

  const cancelEdit = (): void => {
    setEditingId(null)
    setEditName('')
  }

  const saveEdit = async (id: number): Promise<void> => {
    const name = editName.trim()
    if (!name) { cancelEdit(); return }
    const result = await window.api.setupType.update({ id, name }) as IpcResult<SetupType>
    if (result.success) {
      toast({ title: `Renamed to "${result.data.name}"` })
      cancelEdit()
      load()
    } else {
      toast({ variant: 'destructive', title: 'Could not rename', description: result.error })
    }
  }

  const handleDelete = async (st: SetupType): Promise<void> => {
    const result = await window.api.setupType.delete({ id: st.id }) as IpcResult<void>
    if (result.success) {
      toast({ title: `"${st.name}" deleted` })
      load()
    } else {
      toast({ variant: 'destructive', title: 'Cannot delete', description: result.error })
    }
  }

  return (
    <div className="space-y-4">
      {/* Add row */}
      <div className="flex gap-2">
        <Input
          placeholder="New setup type name…"
          value={newName}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd() }}
          className="max-w-sm"
        />
        <Button onClick={() => void handleAdd()} disabled={!newName.trim() || adding}>
          Add
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : setupTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No setup types yet. Add your first one above.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {setupTypes.map((st) => (
            <li key={st.id} className="flex items-center gap-2 px-4 py-3">
              {editingId === st.id ? (
                <>
                  <Input
                    ref={editInputRef}
                    value={editName}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveEdit(st.id)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    className="h-8 max-w-sm"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary"
                    onClick={() => void saveEdit(st.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={cancelEdit}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className={cn('flex-1 text-sm', editingId !== null && 'opacity-50')}>
                    {st.name}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => startEdit(st)}
                    disabled={editingId !== null}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => void handleDelete(st)}
                    disabled={editingId !== null}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
