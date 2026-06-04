import { create } from 'zustand'

export type Page = 'dashboard' | 'trade-logger' | 'trade-view' | 'strategy-rules' | 'knowledge-base' | 'import-review' | 'settings'

interface NavigationStore {
  activePage: Page
  previousPage: Page
  selectedTradeId: number | null
  setPage: (page: Page) => void
  setSelectedTradeId: (id: number | null) => void
  navigateToTrade: (id: number) => void
  goBack: () => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  activePage: 'dashboard',
  previousPage: 'dashboard',
  selectedTradeId: null,
  setPage: (page) => set((s) => ({ activePage: page, previousPage: s.activePage })),
  setSelectedTradeId: (id) => set({ selectedTradeId: id }),
  navigateToTrade: (id) => set((s) => ({ activePage: 'trade-view', previousPage: s.activePage, selectedTradeId: id })),
  goBack: () => set((s) => ({ activePage: s.previousPage }))
}))
