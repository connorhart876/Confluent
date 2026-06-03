import { contextBridge, ipcRenderer } from 'electron'

// Typed invoke wrapper — keeps the renderer surface clean
function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return ipcRenderer.invoke(channel, payload)
}

const api = {
  trade: {
    create: (payload: unknown) => invoke('trade:create', payload),
    list: (filters?: unknown) => invoke('trade:list', filters),
    get: (payload: { id: number }) => invoke('trade:get', payload),
    update: (payload: unknown) => invoke('trade:update', payload),
    delete: (payload: { id: number }) => invoke('trade:delete', payload)
  },
  setupType: {
    list: () => invoke('setup-type:list'),
    create: (payload: { name: string }) => invoke('setup-type:create', payload),
    update: (payload: { id: number; name: string }) => invoke('setup-type:update', payload),
    delete: (payload: { id: number }) => invoke('setup-type:delete', payload)
  },
  strategyRules: {
    get: (payload: { setupTypeId: number }) => invoke('strategy-rules:get', payload),
    upsert: (payload: unknown) => invoke('strategy-rules:upsert', payload)
  },
  screenshot: {
    load: (payload: { filename: string }) => invoke('screenshot:load', payload)
  },
  import: {
    fromCsv: () => invoke('import:from-csv'),
    enqueue: (payload: unknown) => invoke('import:enqueue', payload),
    list: () => invoke('import:list'),
    get: (payload: { id: number }) => invoke('import:get', payload),
    update: (payload: unknown) => invoke('import:update', payload),
    confirm: (payload: { id: number }) => invoke('import:confirm', payload),
    reject: (payload: { id: number }) => invoke('import:reject', payload)
  },
  knowledgeBase: {
    list: (payload?: unknown) => invoke('knowledge-base:list', payload),
    get: (payload: { id: number }) => invoke('knowledge-base:get', payload),
    create: (payload: unknown) => invoke('knowledge-base:create', payload),
    update: (payload: unknown) => invoke('knowledge-base:update', payload),
    delete: (payload: { id: number }) => invoke('knowledge-base:delete', payload)
  },
  apiKey: {
    save: (payload: { key: string }) => invoke('api-key:save', payload),
    clear: () => invoke('api-key:clear'),
    exists: () => invoke('api-key:exists')
  },
  ai: {
    reviewTrade: (payload: { tradeId: number }) => invoke('ai:review-trade', payload)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
