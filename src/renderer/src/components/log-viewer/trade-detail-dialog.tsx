import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Trade, IpcResult } from '@shared/ipc-types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Badge } from '@renderer/components/ui/badge'
import type { BadgeProps } from '@renderer/components/ui/badge'

interface TradeDetailDialogProps {
  tradeId: number | null
  setupTypeMap: Map<number, string>
  onClose: () => void
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

function DetailRow({ label, value, className }: { label: string; value: string; className?: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm ${className ?? ''}`}>{value}</span>
    </div>
  )
}

export function TradeDetailDialog({ tradeId, setupTypeMap, onClose }: TradeDetailDialogProps): JSX.Element {
  const [trade, setTrade] = useState<Trade | null>(null)
  const [screenshotSrc, setScreenshotSrc] = useState<string | null | 'loading'>('loading')

  useEffect(() => {
    if (!tradeId) {
      setTrade(null)
      setScreenshotSrc('loading')
      return
    }

    setTrade(null)
    setScreenshotSrc('loading')

    void window.api.trade.get({ id: tradeId }).then((raw) => {
      const result = raw as IpcResult<Trade>
      if (!result.success) return
      setTrade(result.data)

      if (result.data.screenshotPath) {
        void window.api.screenshot
          .load({ filename: result.data.screenshotPath })
          .then((r) => {
            const sr = r as IpcResult<string | null>
            setScreenshotSrc(sr.success ? sr.data : null)
          })
          .catch(() => setScreenshotSrc(null))
      } else {
        setScreenshotSrc(null)
      }
    })
  }, [tradeId])

  const { text: pnlText, className: pnlClass } = trade ? formatPnl(trade.pnl) : { text: '', className: '' }

  return (
    <Dialog open={tradeId !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trade
              ? `${trade.instrument} ${trade.direction} — ${format(parseISO(trade.entryTime), 'MMM d, yyyy')}`
              : 'Trade Detail'}
          </DialogTitle>
        </DialogHeader>

        {!trade ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Core fields grid */}
            <div className="grid grid-cols-3 gap-4">
              <DetailRow label="Instrument" value={trade.instrument} />
              <DetailRow label="Direction" value={trade.direction} />
              <DetailRow label="Session" value={trade.session} />
              <DetailRow label="Entry Price" value={trade.entryPrice.toString()} />
              <DetailRow label="Exit Price" value={trade.exitPrice.toString()} />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Outcome</span>
                <Badge variant={outcomeVariant(trade.outcome)} className="w-fit">{trade.outcome}</Badge>
              </div>
              <DetailRow
                label="Entry Time"
                value={format(parseISO(trade.entryTime), 'MMM d, yyyy h:mm a')}
              />
              <DetailRow
                label="Exit Time"
                value={format(parseISO(trade.exitTime), 'MMM d, yyyy h:mm a')}
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">P&L</span>
                <span className={`text-sm font-semibold tabular-nums ${pnlClass}`}>{pnlText}</span>
              </div>
              <div className="col-span-3 flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Setup Type</span>
                <span className="text-sm">{setupTypeMap.get(trade.setupTypeId) ?? 'Unknown'}</span>
              </div>
            </div>

            {/* Notes */}
            {trade.notes && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Notes</span>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{trade.notes}</p>
              </div>
            )}

            {/* Screenshot */}
            {trade.screenshotPath && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Chart Screenshot</span>
                {screenshotSrc === 'loading' ? (
                  <div className="flex h-40 items-center justify-center rounded-md border border-border">
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  </div>
                ) : screenshotSrc ? (
                  <img
                    src={screenshotSrc}
                    alt="Chart screenshot"
                    className="w-full rounded-md border border-border object-contain"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center gap-2 rounded-md border border-dashed border-border">
                    <ImageOff className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Screenshot not found</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
