import { useEffect, useMemo, useState } from 'react'
import type { Trade, SetupType, IpcResult } from '@shared/ipc-types'
import { toast } from '@renderer/components/ui/use-toast'
import { useLogViewerStore, type SortColumn } from '@renderer/stores/log-viewer-store'
import { StatsPanel } from '@renderer/components/log-viewer/stats-panel'
import { TradesTable } from '@renderer/components/log-viewer/trades-table'
import { TradeFilters } from '@renderer/components/log-viewer/trade-filters'
import { TradeDetailDialog } from '@renderer/components/log-viewer/trade-detail-dialog'

function sortTrades(
  trades: Trade[],
  column: SortColumn,
  direction: 'asc' | 'desc',
  setupTypeMap: Map<number, string>
): Trade[] {
  return [...trades].sort((a, b) => {
    let cmp = 0
    switch (column) {
      case 'entryTime':
        cmp = a.entryTime.localeCompare(b.entryTime)
        break
      case 'instrument':
        cmp = a.instrument.localeCompare(b.instrument)
        break
      case 'direction':
        cmp = a.direction.localeCompare(b.direction)
        break
      case 'session':
        cmp = a.session.localeCompare(b.session)
        break
      case 'setupType': {
        const nameA = setupTypeMap.get(a.setupTypeId) ?? ''
        const nameB = setupTypeMap.get(b.setupTypeId) ?? ''
        cmp = nameA.localeCompare(nameB)
        break
      }
      case 'quantity':
        cmp = a.quantity - b.quantity
        break
      case 'outcome':
        cmp = a.outcome.localeCompare(b.outcome)
        break
      case 'pnl':
        cmp = a.pnl - b.pnl
        break
    }
    return direction === 'desc' ? -cmp : cmp
  })
}

export function LogViewerPage(): JSX.Element {
  const [trades, setTrades] = useState<Trade[]>([])
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([])
  const [loading, setLoading] = useState(true)

  const { filters, sortColumn, sortDirection, selectedTradeId, setSelectedTradeId } = useLogViewerStore()

  const setupTypeMap = useMemo(
    () => new Map(setupTypes.map((st) => [st.id, st.name])),
    [setupTypes]
  )

  // Load setup types once
  useEffect(() => {
    window.api.setupType
      .list()
      .then((raw) => {
        const result = raw as IpcResult<SetupType[]>
        if (result.success) setSetupTypes(result.data)
      })
      .catch(() => {})
  }, [])

  // Reload trades whenever filters change
  useEffect(() => {
    setLoading(true)

    const ipcFilters: Record<string, unknown> = {}
    if (filters.instrument) ipcFilters.instrument = filters.instrument
    if (filters.session) ipcFilters.session = filters.session
    if (filters.setupTypeId != null) ipcFilters.setupTypeId = filters.setupTypeId
    if (filters.outcome) ipcFilters.outcome = filters.outcome
    if (filters.dateFrom) {
      const d = new Date(filters.dateFrom)
      d.setHours(0, 0, 0, 0)
      ipcFilters.dateFrom = d.toISOString()
    }
    if (filters.dateTo) {
      const d = new Date(filters.dateTo)
      d.setHours(23, 59, 59, 999)
      ipcFilters.dateTo = d.toISOString()
    }

    let cancelled = false

    window.api.trade
      .list(ipcFilters)
      .then((raw) => {
        if (cancelled) return
        const result = raw as IpcResult<Trade[]>
        if (result.success) {
          setTrades(result.data)
        } else {
          toast({ variant: 'destructive', title: 'Failed to load trades', description: result.error })
        }
      })
      .catch(() => {
        if (!cancelled) toast({ variant: 'destructive', title: 'Failed to load trades' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [filters])

  const sortedTrades = useMemo(
    () => sortTrades(trades, sortColumn, sortDirection, setupTypeMap),
    [trades, sortColumn, sortDirection, setupTypeMap]
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Trade Log</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading…' : `${trades.length} trade${trades.length === 1 ? '' : 's'}`}
        </p>
      </div>

      <TradeFilters setupTypes={setupTypes} />

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading trades…</p>
          </div>
        ) : trades.length === 0 && Object.keys(filters).every((k) => filters[k as keyof typeof filters] === null) ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No trades logged yet. Add your first trade in the Trade Logger.</p>
          </div>
        ) : (
          <>
            <StatsPanel trades={trades} />
            <TradesTable trades={sortedTrades} setupTypeMap={setupTypeMap} />
          </>
        )}
      </div>

      <TradeDetailDialog
        tradeId={selectedTradeId}
        setupTypeMap={setupTypeMap}
        onClose={() => setSelectedTradeId(null)}
      />
    </div>
  )
}
