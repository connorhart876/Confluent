import { create } from 'zustand'

export type Page = 'trade-logger' | 'log-viewer' | 'calendar' | 'strategy-rules' | 'settings'

interface NavigationStore {
  activePage: Page
  setPage: (page: Page) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  activePage: 'trade-logger',
  setPage: (page) => set({ activePage: page })
}))
