import type { Trade } from '@shared/ipc-types'

interface StatCardProps {
  label: string
  value: string
  valueClassName?: string
}

function StatCard({ label, value, valueClassName }: StatCardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold tabular-nums ${valueClassName ?? ''}`}>{value}</span>
    </div>
  )
}

interface StatsPanelProps {
  trades: Trade[]
}

export function StatsPanel({ trades }: StatsPanelProps): JSX.Element {
  const total = trades.length
  const wins = trades.filter((t) => t.outcome === 'Win').length
  const winRate = total > 0 ? (wins / total) * 100 : null
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)

  const pnlFormatted =
    totalPnl === 0
      ? '$0.00'
      : totalPnl > 0
        ? `+$${totalPnl.toFixed(2)}`
        : `-$${Math.abs(totalPnl).toFixed(2)}`

  const pnlClass = totalPnl > 0 ? 'text-green-400' : totalPnl < 0 ? 'text-red-400' : ''

  return (
    <div className="mb-4 grid grid-cols-3 gap-3">
      <StatCard label="Total Trades" value={total.toString()} />
      <StatCard label="Win Rate" value={winRate !== null ? `${winRate.toFixed(1)}%` : '--'} />
      <StatCard label="Total P&L" value={pnlFormatted} valueClassName={pnlClass} />
    </div>
  )
}
