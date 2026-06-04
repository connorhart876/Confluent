import { format, parseISO } from 'date-fns'
import type { Trade } from '@shared/ipc-types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@renderer/components/ui/table'
import { Badge } from '@renderer/components/ui/badge'
import { useNavigationStore } from '@renderer/stores/navigation-store'
import type { BadgeProps } from '@renderer/components/ui/badge'

interface RecentTradesListProps {
  trades: Trade[]
  emptyMessage?: string
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

export function RecentTradesList({ trades, emptyMessage = 'No trades yet.' }: RecentTradesListProps): JSX.Element {
  const navigateToTrade = useNavigationStore((s) => s.navigateToTrade)

  if (trades.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-md border border-border">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Instrument</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>P&L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => {
            const { text: pnlText, className: pnlClass } = formatPnl(trade.pnl)
            return (
              <TableRow
                key={trade.id}
                className="cursor-pointer"
                onClick={() => navigateToTrade(trade.id)}
              >
                <TableCell className="whitespace-nowrap">
                  {format(parseISO(trade.entryTime), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>{trade.instrument}</TableCell>
                <TableCell>{trade.direction}</TableCell>
                <TableCell>
                  <Badge variant={outcomeVariant(trade.outcome)}>{trade.outcome}</Badge>
                </TableCell>
                <TableCell className={`whitespace-nowrap tabular-nums ${pnlClass}`}>
                  {pnlText}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
