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
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
