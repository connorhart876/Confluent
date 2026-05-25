import type { Trade, NewTrade, SetupType, StrategyRules } from '../main/db/schema'

export type { Trade, SetupType, StrategyRules }

// Generic IPC response envelope
export type IpcOk<T> = { success: true; data: T }
export type IpcErr = { success: false; error: string }
export type IpcResult<T> = IpcOk<T> | IpcErr

// trade channels
export interface TradeCreatePayload extends Omit<NewTrade, 'id' | 'createdAt' | 'updatedAt'> {
  screenshotData?: string // base64 PNG held in memory until insert
}

export type TradeChannels = {
  'trade:create': [TradeCreatePayload, IpcResult<Trade>]
  'trade:list': [
    {
      instrument?: string
      session?: string
      setupTypeId?: number
      outcome?: string
      dateFrom?: string
      dateTo?: string
    },
    IpcResult<Trade[]>
  ]
  'trade:get': [{ id: number }, IpcResult<Trade>]
  'trade:update': [{ id: number } & Partial<NewTrade>, IpcResult<Trade>]
  'trade:delete': [{ id: number }, IpcResult<void>]
}

// setup-type channels
export type SetupTypeChannels = {
  'setup-type:list': [void, IpcResult<SetupType[]>]
  'setup-type:create': [{ name: string }, IpcResult<SetupType>]
  'setup-type:update': [{ id: number; name: string }, IpcResult<SetupType>]
  'setup-type:delete': [{ id: number }, IpcResult<void>]
}

// strategy-rules channels
export type StrategyRulesChannels = {
  'strategy-rules:get': [{ setupTypeId: number }, IpcResult<StrategyRules>]
  'strategy-rules:upsert': [
    {
      setupTypeId: number
      entryCriteria: string
      htfConfirmation: string
      validVsPremature: string
      sessionFilter: string
      freeformNotes: string
    },
    IpcResult<StrategyRules>
  ]
}

export type AllChannels = TradeChannels & SetupTypeChannels & StrategyRulesChannels
