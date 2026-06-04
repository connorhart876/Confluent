import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Trade, IpcResult } from '@shared/ipc-types'
import { Badge } from '@renderer/components/ui/badge'
import type { BadgeProps } from '@renderer/components/ui/badge'

interface TradeDetailContentProps {
  trade: Trade
  setupTypeName: string
}

export function outcomeVariant(outcome: string): BadgeProps['variant'] {
  if (outcome === 'Win') return 'win'
  if (outcome === 'Loss') return 'loss'
  return 'breakeven'
}

export function formatPnl(pnl: number): { text: string; className: string } {
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

export function TradeDetailContent({ trade, setupTypeName }: TradeDetailContentProps): JSX.Element {
  const [screenshotSrc, setScreenshotSrc] = useState<string | null | 'loading'>('loading')

  useEffect(() => {
    setScreenshotSrc('loading')
    if (trade.screenshotPath) {
      void window.api.screenshot
        .load({ filename: trade.screenshotPath })
        .then((r) => {
          const sr = r as IpcResult<string | null>
          setScreenshotSrc(sr.success ? sr.data : null)
        })
        .catch(() => setScreenshotSrc(null))
    } else {
      setScreenshotSrc(null)
    }
  }, [trade.screenshotPath])

  const { text: pnlText, className: pnlClass } = formatPnl(trade.pnl)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <DetailRow label="Instrument" value={trade.instrument} />
        <DetailRow label="Direction" value={trade.direction} />
        <DetailRow label="Session" value={trade.session} />
        <DetailRow label="Entry Price" value={trade.entryPrice.toString()} />
        <DetailRow label="Exit Price" value={trade.exitPrice.toString()} />
        <DetailRow label="Contracts" value={trade.quantity.toString()} />
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
        <div className="col-span-2 flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Setup Type</span>
          <span className="text-sm">{setupTypeName}</span>
        </div>
      </div>

      {trade.notes && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Notes</span>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{trade.notes}</p>
        </div>
      )}

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
  )
}
