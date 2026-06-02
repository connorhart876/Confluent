import { create } from 'zustand'
import type { PendingImport, SetupType, IpcResult } from '@shared/ipc-types'

interface ImportReviewStore {
  pendingImports: PendingImport[]
  setupTypes: SetupType[]
  selectedIds: Set<number>
  loading: boolean
  fetchAll: () => Promise<void>
  refresh: () => Promise<void>
  toggleSelect: (id: number) => void
  selectAll: () => void
  clearSelection: () => void
}

export const useImportReviewStore = create<ImportReviewStore>((set, get) => ({
  pendingImports: [],
  setupTypes: [],
  selectedIds: new Set(),
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    try {
      const [rawImports, rawSetupTypes] = await Promise.all([
        window.api.import.list(),
        window.api.setupType.list()
      ])
      const importsResult = rawImports as IpcResult<PendingImport[]>
      const setupTypesResult = rawSetupTypes as IpcResult<SetupType[]>
      set({
        pendingImports: importsResult.success ? importsResult.data : [],
        setupTypes: setupTypesResult.success ? setupTypesResult.data : []
      })
    } finally {
      set({ loading: false })
    }
  },

  refresh: async () => {
    const raw = await window.api.import.list()
    const result = raw as IpcResult<PendingImport[]>
    if (result.success) {
      const existingIds = new Set(result.data.map((p) => p.id))
      const selectedIds = new Set([...get().selectedIds].filter((id) => existingIds.has(id)))
      set({ pendingImports: result.data, selectedIds })
    }
  },

  toggleSelect: (id) => {
    set((s) => {
      const next = new Set(s.selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedIds: next }
    })
  },

  selectAll: () => {
    set((s) => ({ selectedIds: new Set(s.pendingImports.map((p) => p.id)) }))
  },

  clearSelection: () => {
    set({ selectedIds: new Set() })
  }
}))
