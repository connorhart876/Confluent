import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { IpcResult, ApiKeyExistsResponse } from '@shared/ipc-types'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Badge } from '@renderer/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import { toast } from '@renderer/components/ui/use-toast'

export function ApiKeySection(): JSX.Element {
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [status, setStatus] = useState<ApiKeyExistsResponse>({
    exists: false,
    encryptionAvailable: true
  })

  const loadStatus = (): void => {
    window.api.apiKey
      .exists()
      .then((raw) => {
        const result = raw as IpcResult<ApiKeyExistsResponse>
        if (result.success) setStatus(result.data)
      })
      .catch(() => {
        // non-fatal — status stays at default
      })
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleSave = async (): Promise<void> => {
    const trimmed = keyInput.trim()
    if (!trimmed) return

    if (!trimmed.startsWith('sk-ant-')) {
      toast({
        title: 'Key format looks unexpected',
        description: 'Anthropic keys typically start with "sk-ant-". Double-check before using.'
      })
    }

    setSaving(true)
    try {
      const result = (await window.api.apiKey.save({ key: trimmed })) as IpcResult<void>
      if (result.success) {
        toast({ title: 'API key saved' })
        setKeyInput('')
        loadStatus()
      } else {
        toast({ variant: 'destructive', title: 'Could not save API key', description: result.error })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async (): Promise<void> => {
    const result = (await window.api.apiKey.clear()) as IpcResult<void>
    if (result.success) {
      toast({ title: 'API key removed' })
      loadStatus()
    } else {
      toast({ variant: 'destructive', title: 'Could not remove API key', description: result.error })
    }
    setClearDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        {!status.encryptionAvailable ? (
          <Badge variant="destructive">Encryption unavailable on this system</Badge>
        ) : status.exists ? (
          <Badge variant="secondary">Key stored</Badge>
        ) : (
          <Badge variant="outline">No key stored</Badge>
        )}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative max-w-sm flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            placeholder="sk-ant-…"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSave() }}
            className="pr-10"
            disabled={!status.encryptionAvailable}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowKey((v) => !v)}
            tabIndex={-1}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button
          onClick={() => void handleSave()}
          disabled={!keyInput.trim() || saving || !status.encryptionAvailable}
        >
          Save
        </Button>
      </div>

      {/* Clear button */}
      {status.exists && (
        <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Remove key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove API key?</DialogTitle>
              <DialogDescription>
                Remove stored API key? AI review will stop working until you re-enter it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void handleClear()}>
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
