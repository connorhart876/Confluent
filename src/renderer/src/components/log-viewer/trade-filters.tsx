import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import type { SetupType } from '@shared/ipc-types'
import { instruments, sessions, outcomes } from '@renderer/lib/trade-form-schema'
import { Button } from '@renderer/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { Calendar } from '@renderer/components/ui/calendar'
import { useLogViewerStore } from '@renderer/stores/log-viewer-store'
import { cn } from '@renderer/lib/utils'

interface TradeFiltersProps {
  setupTypes: SetupType[]
}

function DatePickerButton({
  label,
  value,
  onChange
}: {
  label: string
  value: Date | null
  onChange: (d: Date | undefined) => void
}): JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-[140px] justify-start text-left font-normal', !value && 'text-muted-foreground')}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'MMM d, yyyy') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={onChange}
        />
      </PopoverContent>
    </Popover>
  )
}

export function TradeFilters({ setupTypes }: TradeFiltersProps): JSX.Element {
  const { filters, setFilter, resetFilters } = useLogViewerStore()

  const hasActiveFilters =
    filters.instrument !== null ||
    filters.session !== null ||
    filters.setupTypeId !== null ||
    filters.outcome !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
      <Select
        value={filters.instrument ?? ''}
        onValueChange={(v) => setFilter('instrument', v || null)}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="Instrument" />
        </SelectTrigger>
        <SelectContent>
          {instruments.map((i) => (
            <SelectItem key={i} value={i}>{i}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.session ?? ''}
        onValueChange={(v) => setFilter('session', v || null)}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="Session" />
        </SelectTrigger>
        <SelectContent>
          {sessions.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.setupTypeId !== null ? String(filters.setupTypeId) : ''}
        onValueChange={(v) => setFilter('setupTypeId', v ? Number(v) : null)}
      >
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Setup type" />
        </SelectTrigger>
        <SelectContent>
          {setupTypes.map((st) => (
            <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.outcome ?? ''}
        onValueChange={(v) => setFilter('outcome', v || null)}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="Outcome" />
        </SelectTrigger>
        <SelectContent>
          {outcomes.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DatePickerButton
        label="From date"
        value={filters.dateFrom}
        onChange={(d) => setFilter('dateFrom', d ?? null)}
      />

      <DatePickerButton
        label="To date"
        value={filters.dateTo}
        onChange={(d) => setFilter('dateTo', d ?? null)}
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetFilters}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
