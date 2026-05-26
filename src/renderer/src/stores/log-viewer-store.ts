import { create } from 'zustand'

export interface LogViewerFilters {
  instrument: string | null
  session: string | null
  setupTypeId: number | null
  outcome: string | null
  dateFrom: Date | null
  dateTo: Date | null
}

export type SortColumn = 'entryTime' | 'instrument' | 'direction' | 'session' | 'setupType' | 'outcome' | 'pnl'

const defaultFilters: LogViewerFilters = {
  instrument: null,
  session: null,
  setupTypeId: null,
  outcome: null,
  dateFrom: null,
  dateTo: null
}

interface LogViewerStore {
  filters: LogViewerFilters
  sortColumn: SortColumn
  sortDirection: 'asc' | 'desc'
  selectedTradeId: number | null
  setFilter: <K extends keyof LogViewerFilters>(key: K, value: LogViewerFilters[K]) => void
  resetFilters: () => void
  setSort: (column: SortColumn) => void
  setSelectedTradeId: (id: number | null) => void
}

export const useLogViewerStore = create<LogViewerStore>((set, get) => ({
  filters: defaultFilters,
  sortColumn: 'entryTime',
  sortDirection: 'desc',
  selectedTradeId: null,

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  resetFilters: () => set({ filters: defaultFilters }),

  setSort: (column) => {
    const { sortColumn, sortDirection } = get()
    if (column === sortColumn) {
      set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' })
    } else {
      set({ sortColumn: column, sortDirection: 'asc' })
    }
  },

  setSelectedTradeId: (id) => set({ selectedTradeId: id })
}))
