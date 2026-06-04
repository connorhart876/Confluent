import { useEffect, useMemo, useState } from 'react'
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import type { Trade, IpcResult } from '@shared/ipc-types'
import { toast } from '@renderer/components/ui/use-toast'
import { StatsPanel } from '@renderer/components/log-viewer/stats-panel'
import { CalendarGrid } from '@renderer/components/calendar/calendar-grid'
import { RecentTradesList } from '@renderer/components/dashboard/recent-trades-list'
import { Button } from '@renderer/components/ui/button'

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

export function DashboardPage(): JSX.Element {
  const [allTrades, setAllTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMonth, setActiveMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  useEffect(() => {
    setLoading(true)
    let cancelled = false

    window.api.trade
      .list({})
      .then((raw) => {
        if (cancelled) return
        const result = raw as IpcResult<Trade[]>
        if (result.success) {
          setAllTrades(result.data)
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
  }, [])

  const monthTrades = useMemo(() => {
    const monthStart = startOfMonth(activeMonth).toISOString()
    const monthEnd = endOfMonth(activeMonth).toISOString()
    return allTrades.filter((t) => t.entryTime >= monthStart && t.entryTime <= monthEnd)
  }, [allTrades, activeMonth])

  const tradesByDate = useMemo(() => groupTradesByDate(monthTrades), [monthTrades])

  const recentTrades = useMemo(() => {
    if (selectedDay) {
      const key = format(selectedDay, 'yyyy-MM-dd')
      return tradesByDate.get(key) ?? []
    }
    return [...allTrades]
      .sort((a, b) => b.entryTime.localeCompare(a.entryTime))
      .slice(0, 10)
  }, [allTrades, selectedDay, tradesByDate])

  function handleDayClick(date: Date): void {
    setSelectedDay(date)
  }

  const selectedDayLabel = selectedDay ? format(selectedDay, 'MMMM d, yyyy') : null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading…' : `${allTrades.length} trade${allTrades.length === 1 ? '' : 's'} total`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        ) : (
          <>
            <StatsPanel trades={allTrades} />

            <div className="flex gap-6 min-h-0">
              {/* Calendar */}
              <div className="flex-1 rounded-md border border-border overflow-hidden min-w-0">
                <CalendarGrid
                  activeMonth={activeMonth}
                  tradesByDate={tradesByDate}
                  onPrevMonth={() => {
                    setActiveMonth((m) => addMonths(m, -1))
                    setSelectedDay(null)
                  }}
                  onNextMonth={() => {
                    setActiveMonth((m) => addMonths(m, 1))
                    setSelectedDay(null)
                  }}
                  onToday={() => {
                    setActiveMonth(startOfMonth(new Date()))
                    setSelectedDay(null)
                  }}
                  onDayClick={handleDayClick}
                />
              </div>

              {/* Recent trades */}
              <div className="w-80 flex-shrink-0 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">
                    {selectedDayLabel ? selectedDayLabel : 'Recent Trades'}
                  </h2>
                  {selectedDay && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-0.5 px-2 text-xs"
                      onClick={() => setSelectedDay(null)}
                    >
                      Show recent
                    </Button>
                  )}
                </div>
                <RecentTradesList
                  trades={recentTrades}
                  emptyMessage={
                    selectedDay
                      ? 'No trades on this day.'
                      : 'No trades logged yet.'
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
