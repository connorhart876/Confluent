import { format, isSameMonth, isToday, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Trade } from '@shared/ipc-types'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

interface CalendarGridProps {
  activeMonth: Date
  tradesByDate: Map<string, Trade[]>
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onDayClick: (date: Date) => void
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatPnl(pnl: number): string {
  if (pnl === 0) return '$0.00'
  if (pnl > 0) return `+$${pnl.toFixed(2)}`
  return `-$${Math.abs(pnl).toFixed(2)}`
}

export function CalendarGrid({
  activeMonth,
  tradesByDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onDayClick
}: CalendarGridProps): JSX.Element {
  const gridStart = startOfWeek(activeMonth, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(
    new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0),
    { weekStartsOn: 0 }
  )
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const isCurrentCalendarMonth =
    format(new Date(), 'yyyy-MM') === format(activeMonth, 'yyyy-MM')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onPrevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-36 text-center text-base font-semibold">
            {format(activeMonth, 'MMMM yyyy')}
          </span>
          <Button variant="ghost" size="icon" onClick={onNextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {!isCurrentCalendarMonth && (
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const inMonth = isSameMonth(day, activeMonth)
            const dayIsToday = isToday(day)
            const trades = inMonth ? (tradesByDate.get(dateKey) ?? []) : []
            const hasTrades = trades.length > 0
            const clickable = inMonth && hasTrades

            const netPnl = hasTrades ? trades.reduce((s, t) => s + t.pnl, 0) : 0

            return (
              <div
                key={dateKey}
                onClick={clickable ? () => onDayClick(day) : undefined}
                className={cn(
                  'min-h-[90px] rounded-md p-2 transition-colors',
                  inMonth ? 'border border-border/60' : 'border border-transparent',
                  clickable && 'cursor-pointer',
                  hasTrades && netPnl > 0 && 'bg-green-950/40 hover:bg-green-950/60',
                  hasTrades && netPnl < 0 && 'bg-red-950/40 hover:bg-red-950/60',
                  hasTrades && netPnl === 0 && 'hover:bg-muted/50',
                  !hasTrades && inMonth && 'hover:bg-muted/20',
                  dayIsToday && inMonth && 'ring-1 ring-primary'
                )}
              >
                <div
                  className={cn(
                    'text-sm font-medium leading-none mb-1.5',
                    !inMonth && 'text-muted-foreground/30',
                    dayIsToday && inMonth && 'text-primary'
                  )}
                >
                  {format(day, 'd')}
                </div>

                {hasTrades && (
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">
                      {trades.length} {trades.length === 1 ? 'trade' : 'trades'}
                    </div>
                    <div
                      className={cn(
                        'text-xs font-medium tabular-nums',
                        netPnl > 0 && 'text-green-400',
                        netPnl < 0 && 'text-red-400'
                      )}
                    >
                      {formatPnl(netPnl)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
