import { useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { PendingImport, SetupType, IpcResult } from '@shared/ipc-types'
import { sessions } from '@shared/constants'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import { Badge } from '@renderer/components/ui/badge'
import type { BadgeProps } from '@renderer/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { ScreenshotAttach } from '@renderer/components/trade-form/screenshot-attach'
import { toast } from '@renderer/components/ui/use-toast'
import { ConfirmRejectDialog } from './confirm-reject-dialog'

interface PendingImportRowProps {
  pending: PendingImport
  setupTypes: SetupType[]
  selected: boolean
  onToggleSelect: () => void
  onDone: () => void
}

function outcomeVariant(outcome: string): BadgeProps['variant'] {
  if (outcome === 'Win') return 'win'
  if (outcome === 'Loss') return 'loss'
  return 'breakeven'
}

function formatPnl(pnl: number): { text: string; className: string } {
  if (pnl > 0) return { text: `+$${pnl.toFixed(2)}`, className: 'text-green-400' }
  if (pnl < 0) return { text: `-$${Math.abs(pnl).toFixed(2)}`, className: 'text-red-400' }
  return { text: '$0.00', className: '' }
}

export function PendingImportRow({ pending, setupTypes, selected, onToggleSelect, onDone }: PendingImportRowProps): JSX.Element {
  const [localSession, setLocalSession] = useState<string | null>(pending.session)
  const [localSetupTypeId, setLocalSetupTypeId] = useState<number | null>(pending.setupTypeId)
  const [localNotes, setLocalNotes] = useState(pending.notes ?? '')
  const [screenshotSrc, setScreenshotSrc] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const savedNotesRef = useRef(pending.notes ?? '')

  useEffect(() => {
    if (!pending.screenshotPath) return
    void window.api.screenshot.load({ filename: pending.screenshotPath }).then((raw) => {
      const result = raw as IpcResult<string | null>
      if (result.success && result.data) setScreenshotSrc(result.data)
    })
  }, [pending.screenshotPath])

  const updateField = async (payload: Record<string, unknown>): Promise<boolean> => {
    const raw = await window.api.import.update({ id: pending.id, ...payload })
    const result = raw as IpcResult<PendingImport>
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Save failed', description: result.error })
      return false
    }
    return true
  }

  const handleSessionChange = (value: string): void => {
    setLocalSession(value)
    void updateField({ session: value })
  }

  const handleSetupTypeChange = (value: string): void => {
    const id = parseInt(value, 10)
    setLocalSetupTypeId(id)
    void updateField({ setupTypeId: id })
  }

  const handleNotesBlur = (): void => {
    if (localNotes === savedNotesRef.current) return
    savedNotesRef.current = localNotes
    void updateField({ notes: localNotes })
  }

  const handleScreenshotChange = (base64: string | null): void => {
    setScreenshotSrc(base64)
    if (base64) {
      void updateField({ screenshotData: base64 })
    } else {
      void updateField({ screenshotPath: null })
    }
  }

  const handleConfirm = async (): Promise<void> => {
    setConfirming(true)
    try {
      const raw = await window.api.import.confirm({ id: pending.id })
      const result = raw as IpcResult<unknown>
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Confirm failed', description: result.error })
        return
      }
      toast({ title: 'Trade confirmed and logged' })
      onDone()
    } finally {
      setConfirming(false)
    }
  }

  const handleRejectConfirmed = async (): Promise<void> => {
    setRejecting(true)
    setShowRejectDialog(false)
    try {
      const raw = await window.api.import.reject({ id: pending.id })
      const result = raw as IpcResult<void>
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Reject failed', description: result.error })
        return
      }
      toast({ title: 'Trade rejected' })
      onDone()
    } finally {
      setRejecting(false)
    }
  }

  const canConfirm = !!localSession && localSetupTypeId != null
  const { text: pnlText, className: pnlClass } = formatPnl(pending.pnl)

  return (
    <>
      <div className={cn(
        'rounded-md border border-border bg-card p-4 space-y-4',
        selected && 'border-primary/50 bg-primary/5'
      )}>
        {/* Read-only header strip */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
            checked={selected}
            onChange={onToggleSelect}
          />
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium">{pending.instrument}</span>
            <span className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              pending.direction === 'Long'
                ? 'bg-green-900/60 text-green-300'
                : 'bg-red-900/60 text-red-300'
            )}>
              {pending.direction}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {pending.entryPrice} → {pending.exitPrice}
            </span>
            <span className="text-sm text-muted-foreground">
              {format(parseISO(pending.entryTime), 'MMM d, HH:mm')} – {format(parseISO(pending.exitTime), 'HH:mm')}
            </span>
            <span className="text-sm text-muted-foreground">{pending.quantity} ct</span>
            <span className={cn('text-sm font-medium tabular-nums', pnlClass)}>{pnlText}</span>
            <Badge variant={outcomeVariant(pending.outcome)}>{pending.outcome}</Badge>
          </div>
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-2 gap-3 pl-7">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Session</label>
            <Select
              value={localSession ?? undefined}
              onValueChange={handleSessionChange}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select session…" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Setup Type</label>
            {setupTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No setup types defined</p>
            ) : (
              <Select
                value={localSetupTypeId != null ? String(localSetupTypeId) : undefined}
                onValueChange={handleSetupTypeChange}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select setup type…" />
                </SelectTrigger>
                <SelectContent>
                  {setupTypes.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Context, observations, mistakes…"
              className="min-h-[72px] resize-none text-sm"
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Chart Screenshot</label>
            <ScreenshotAttach value={screenshotSrc} onChange={handleScreenshotChange} />
          </div>
        </div>

        {/* Row actions */}
        <div className="flex items-center justify-end gap-2 pl-7">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={rejecting || confirming}
            onClick={() => setShowRejectDialog(true)}
          >
            {rejecting ? 'Rejecting…' : 'Reject'}
          </Button>
          <Button
            size="sm"
            disabled={!canConfirm || confirming || rejecting}
            onClick={() => void handleConfirm()}
            title={!canConfirm ? 'Assign session and setup type to confirm' : undefined}
          >
            {confirming ? 'Confirming…' : 'Confirm'}
          </Button>
        </div>
      </div>

      <ConfirmRejectDialog
        open={showRejectDialog}
        count={1}
        onConfirm={() => void handleRejectConfirmed()}
        onCancel={() => setShowRejectDialog(false)}
      />
    </>
  )
}
