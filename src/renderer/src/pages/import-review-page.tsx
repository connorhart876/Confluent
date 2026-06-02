import { useEffect, useState } from 'react'
import { Inbox, Upload } from 'lucide-react'
import type { IpcResult } from '@shared/ipc-types'
import type { ImportFromCsvResult } from '@shared/ipc-types'
import { Button } from '@renderer/components/ui/button'
import { toast } from '@renderer/components/ui/use-toast'
import { useImportReviewStore } from '@renderer/stores/import-review-store'
import { PendingImportRow } from '@renderer/components/import-review/pending-import-row'
import { ConfirmRejectDialog } from '@renderer/components/import-review/confirm-reject-dialog'

export function ImportReviewPage(): JSX.Element {
  const {
    pendingImports,
    setupTypes,
    selectedIds,
    loading,
    fetchAll,
    refresh,
    toggleSelect,
    selectAll,
    clearSelection
  } = useImportReviewStore()

  const [importing, setImporting] = useState(false)
  const [bulkConfirming, setBulkConfirming] = useState(false)
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false)
  const [bulkRejecting, setBulkRejecting] = useState(false)

  useEffect(() => {
    void fetchAll()
  }, [])

  const handleImportCsv = async (): Promise<void> => {
    setImporting(true)
    try {
      const raw = await window.api.import.fromCsv()
      const result = raw as IpcResult<ImportFromCsvResult>
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Import failed', description: result.error })
        return
      }
      if (result.data.cancelled) return

      const { enqueuedCount, parseErrors, summary } = result.data
      const parts: string[] = []
      if (summary?.unpaired) parts.push(`${summary.unpaired} unpaired row${summary.unpaired !== 1 ? 's' : ''} skipped`)
      if (parseErrors.length > 0) parts.push(`${parseErrors.length} parse error${parseErrors.length !== 1 ? 's' : ''}`)

      toast({
        title: `${enqueuedCount} trade${enqueuedCount !== 1 ? 's' : ''} queued for review`,
        description: parts.length > 0 ? parts.join(' · ') : undefined
      })

      await refresh()
    } finally {
      setImporting(false)
    }
  }

  const handleBulkConfirm = async (): Promise<void> => {
    const ids = [...selectedIds]
    setBulkConfirming(true)
    let confirmed = 0
    let skipped = 0

    try {
      for (const id of ids) {
        const raw = await window.api.import.confirm({ id })
        const result = raw as IpcResult<unknown>
        if (result.success) confirmed++
        else skipped++
      }

      await refresh()
      clearSelection()

      if (skipped > 0) {
        toast({
          title: `Confirmed ${confirmed} of ${ids.length}`,
          description: `${skipped} skipped — missing session or setup type`
        })
      } else {
        toast({ title: `Confirmed ${confirmed} trade${confirmed !== 1 ? 's' : ''}` })
      }
    } finally {
      setBulkConfirming(false)
    }
  }

  const handleBulkRejectConfirmed = async (): Promise<void> => {
    const ids = [...selectedIds]
    setShowBulkRejectDialog(false)
    setBulkRejecting(true)
    let rejected = 0

    try {
      for (const id of ids) {
        const raw = await window.api.import.reject({ id })
        const result = raw as IpcResult<void>
        if (result.success) rejected++
      }

      await refresh()
      clearSelection()
      toast({ title: `Rejected ${rejected} trade${rejected !== 1 ? 's' : ''}` })
    } finally {
      setBulkRejecting(false)
    }
  }

  const selectedCount = selectedIds.size
  const allSelected = pendingImports.length > 0 && pendingImports.every((p) => selectedIds.has(p.id))
  const busy = bulkConfirming || bulkRejecting || importing

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold">Import Review</h1>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? 'Loading…'
                  : pendingImports.length > 0
                    ? `${pendingImports.length} trade${pendingImports.length !== 1 ? 's' : ''} awaiting review`
                    : 'No pending imports'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedCount > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => setShowBulkRejectDialog(true)}
                  >
                    {bulkRejecting ? 'Rejecting…' : `Reject ${selectedCount}`}
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleBulkConfirm()}
                  >
                    {bulkConfirming ? 'Confirming…' : `Confirm ${selectedCount}`}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={importing}
                onClick={() => void handleImportCsv()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {importing ? 'Importing…' : 'Import CSV'}
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pendingImports.length === 0 ? (
            <EmptyState onImport={() => void handleImportCsv()} importing={importing} />
          ) : (
            <div className="space-y-3">
              {/* Select-all row */}
              <div className="flex items-center gap-3 pb-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-primary"
                  checked={allSelected}
                  onChange={(e) => { if (e.target.checked) selectAll(); else clearSelection() }}
                />
                <span className="text-sm text-muted-foreground">
                  {allSelected ? 'Deselect all' : 'Select all'}
                </span>
              </div>

              {pendingImports.map((p) => (
                <PendingImportRow
                  key={p.id}
                  pending={p}
                  setupTypes={setupTypes}
                  selected={selectedIds.has(p.id)}
                  onToggleSelect={() => toggleSelect(p.id)}
                  onDone={() => void refresh()}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmRejectDialog
        open={showBulkRejectDialog}
        count={selectedCount}
        onConfirm={() => void handleBulkRejectConfirmed()}
        onCancel={() => setShowBulkRejectDialog(false)}
      />
    </>
  )
}

function EmptyState({ onImport, importing }: { onImport: () => void; importing: boolean }): JSX.Element {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-md border border-border">
      <Inbox className="h-10 w-10 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium">No pending imports</p>
        <p className="text-sm text-muted-foreground">Import a Tradovate CSV to get started</p>
      </div>
      <Button variant="outline" size="sm" disabled={importing} onClick={onImport}>
        <Upload className="mr-2 h-4 w-4" />
        {importing ? 'Importing…' : 'Import CSV'}
      </Button>
    </div>
  )
}
