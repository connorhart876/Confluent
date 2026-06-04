import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { Trade, IpcResult } from '@shared/ipc-types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { TradeDetailContent } from '@renderer/components/trade-view/trade-detail-content'

interface TradeDetailDialogProps {
  tradeId: number | null
  setupTypeMap: Map<number, string>
  onClose: () => void
}

export function TradeDetailDialog({ tradeId, setupTypeMap, onClose }: TradeDetailDialogProps): JSX.Element {
  const [trade, setTrade] = useState<Trade | null>(null)

  useEffect(() => {
    if (!tradeId) {
      setTrade(null)
      return
    }

    setTrade(null)

    void window.api.trade.get({ id: tradeId }).then((raw) => {
      const result = raw as IpcResult<Trade>
      if (result.success) setTrade(result.data)
    })
  }, [tradeId])

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
          <TradeDetailContent
            trade={trade}
            setupTypeName={setupTypeMap.get(trade.setupTypeId) ?? 'Unknown'}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
