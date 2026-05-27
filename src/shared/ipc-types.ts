import type { Trade, NewTrade, SetupType, StrategyRules, PendingImport } from '../main/db/schema'

export type { Trade, SetupType, StrategyRules, PendingImport }

// Generic IPC response envelope
export type IpcOk<T> = { success: true; data: T }
export type IpcErr = { success: false; error: string }
export type IpcResult<T> = IpcOk<T> | IpcErr

// trade channels
export interface TradeCreatePayload extends Omit<NewTrade, 'id' | 'createdAt' | 'updatedAt' | 'pnl' | 'outcome'> {
  screenshotData?: string
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

// screenshot channels
export type ScreenshotChannels = {
  'screenshot:load': [{ filename: string }, IpcResult<string | null>]
}

// import channels
export interface PendingImportEnqueuePayload {
  instrument: string
  direction: string
  entryPrice: number
  exitPrice: number
  entryTime: string
  exitTime: string
  quantity: number
  pnl: number
  outcome: string
}

export interface PendingImportUpdatePayload {
  id: number
  session?: string | null
  setupTypeId?: number | null
  notes?: string | null
  screenshotPath?: string | null
  screenshotData?: string
}

export type ImportChannels = {
  'import:enqueue': [PendingImportEnqueuePayload[], IpcResult<PendingImport[]>]
  'import:list': [void, IpcResult<PendingImport[]>]
  'import:get': [{ id: number }, IpcResult<PendingImport>]
  'import:update': [PendingImportUpdatePayload, IpcResult<PendingImport>]
  'import:confirm': [{ id: number }, IpcResult<Trade>]
  'import:reject': [{ id: number }, IpcResult<void>]
}

export type AllChannels = TradeChannels & SetupTypeChannels & StrategyRulesChannels & ScreenshotChannels & ImportChannels
