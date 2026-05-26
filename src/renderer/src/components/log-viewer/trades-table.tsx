import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Trade } from '@shared/ipc-types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@renderer/components/ui/table'
import { Badge } from '@renderer/components/ui/badge'
import { useLogViewerStore, type SortColumn } from '@renderer/stores/log-viewer-store'
import type { BadgeProps } from '@renderer/components/ui/badge'

interface TradesTableProps {
  trades: Trade[]
  setupTypeMap: Map<number, string>
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

const columns: { key: SortColumn; label: string }[] = [
  { key: 'entryTime', label: 'Date' },
  { key: 'instrument', label: 'Instrument' },
  { key: 'direction', label: 'Direction' },
  { key: 'session', label: 'Session' },
  { key: 'setupType', label: 'Setup Type' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'pnl', label: 'P&L' }
]

function SortIcon({ column }: { column: SortColumn }): JSX.Element {
  const { sortColumn, sortDirection } = useLogViewerStore()
  if (sortColumn !== column) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />
  return sortDirection === 'asc'
    ? <ArrowUp className="ml-1 inline h-3 w-3" />
    : <ArrowDown className="ml-1 inline h-3 w-3" />
}

export function TradesTable({ trades, setupTypeMap }: TradesTableProps): JSX.Element {
  const { setSort, setSelectedTradeId } = useLogViewerStore()

  if (trades.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-md border border-border">
        <p className="text-sm text-muted-foreground">No trades match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map(({ key, label }) => (
              <TableHead
                key={key}
                className="cursor-pointer select-none whitespace-nowrap hover:text-foreground"
                onClick={() => setSort(key)}
              >
                {label}
                <SortIcon column={key} />
              </TableHead>
            ))}
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => {
            const { text: pnlText, className: pnlClass } = formatPnl(trade.pnl)
            return (
              <TableRow
                key={trade.id}
                className="cursor-pointer"
                onClick={() => setSelectedTradeId(trade.id)}
              >
                <TableCell className="whitespace-nowrap">
                  {format(parseISO(trade.entryTime), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>{trade.instrument}</TableCell>
                <TableCell>{trade.direction}</TableCell>
                <TableCell>{trade.session}</TableCell>
                <TableCell>{setupTypeMap.get(trade.setupTypeId) ?? 'Unknown'}</TableCell>
                <TableCell>
                  <Badge variant={outcomeVariant(trade.outcome)}>{trade.outcome}</Badge>
                </TableCell>
                <TableCell className={`whitespace-nowrap tabular-nums ${pnlClass}`}>
                  {pnlText}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {trade.notes}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
