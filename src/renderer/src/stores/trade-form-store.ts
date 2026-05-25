import { create } from 'zustand'

interface TradeFormStore {
  lastInstrument: string | null
  lastSession: string | null
  setLastValues: (instrument: string, session: string) => void
}

export const useTradeFormStore = create<TradeFormStore>((set) => ({
  lastInstrument: null,
  lastSession: null,
  setLastValues: (instrument, session) => set({ lastInstrument: instrument, lastSession: session })
}))
