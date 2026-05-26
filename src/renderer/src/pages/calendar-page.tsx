import { useEffect, useMemo, useState } from 'react'
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import type { Trade, IpcResult } from '@shared/ipc-types'
import { toast } from '@renderer/components/ui/use-toast'
import { useLogViewerStore } from '@renderer/stores/log-viewer-store'
import { useNavigationStore } from '@renderer/stores/navigation-store'
import { CalendarGrid } from '@renderer/components/calendar/calendar-grid'

function groupTradesByDate(trades: Trade[]): Map<string, Trade[]> {
  const map = new Map<string, Trade[]>()
  for (const trade of trades) {
    const key = format(parseISO(trade.entryTime), 'yyyy-MM-dd')
    const existing = map.get(key)
    if (existing) existing.push(trade)
    else map.set(key, [trade])
  }
  return map
}

export function CalendarPage(): JSX.Element {
  const [activeMonth, setActiveMonth] = useState(() => startOfMonth(new Date()))
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let cancelled = false

    window.api.trade
      .list({
        dateFrom: startOfMonth(activeMonth).toISOString(),
        dateTo: endOfMonth(activeMonth).toISOString()
      })
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

    return () => {
      cancelled = true
    }
  }, [activeMonth])

  const tradesByDate = useMemo(() => groupTradesByDate(trades), [trades])

  function handleDayClick(date: Date): void {
    const logStore = useLogViewerStore.getState()
    logStore.resetFilters()
    logStore.setFilter('dateFrom', date)
    logStore.setFilter('dateTo', date)
    useNavigationStore.getState().setPage('log-viewer')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          {loading
            ? 'Loading…'
            : `${trades.length} trade${trades.length === 1 ? '' : 's'} this month`}
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <CalendarGrid
          activeMonth={activeMonth}
          tradesByDate={tradesByDate}
          onPrevMonth={() => setActiveMonth((m) => addMonths(m, -1))}
          onNextMonth={() => setActiveMonth((m) => addMonths(m, 1))}
          onToday={() => setActiveMonth(startOfMonth(new Date()))}
          onDayClick={handleDayClick}
        />
      </div>
    </div>
  )
}
