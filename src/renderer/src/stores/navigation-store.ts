import { create } from 'zustand'

export type Page = 'dashboard' | 'trade-logger' | 'trade-view' | 'strategy-rules' | 'knowledge-base' | 'settings'

interface NavigationStore {
  activePage: Page
  selectedTradeId: number | null
  setPage: (page: Page) => void
  setSelectedTradeId: (id: number | null) => void
  navigateToTrade: (id: number) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  activePage: 'dashboard',
  selectedTradeId: null,
  setPage: (page) => set({ activePage: page }),
  setSelectedTradeId: (id) => set({ selectedTradeId: id }),
  navigateToTrade: (id) => set({ activePage: 'trade-view', selectedTradeId: id })
}))
