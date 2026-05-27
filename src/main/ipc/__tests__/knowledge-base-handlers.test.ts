import { describe, it, expect, vi } from 'vitest'
import {
  handleKnowledgeBaseList,
  handleKnowledgeBaseGet,
  handleKnowledgeBaseCreate,
  handleKnowledgeBaseUpdate,
  handleKnowledgeBaseDelete
} from '../knowledge-base-handlers'
import type { Db } from '../../db'
import type { KnowledgeBaseEntry } from '../../../shared/ipc-types'

// ── Mock DB factory ─────────────────────────────────────────────────────────

function makeChain(opts: { get?: unknown; all?: unknown[] } = {}) {
  const c = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    get: vi.fn(() => opts.get ?? undefined),
    all: vi.fn(() => opts.all ?? []),
    run: vi.fn()
  }
  return c
}

function makeDb(opts: {
  selectGet?: unknown
  selectAll?: unknown[]
  insertAll?: unknown[]
  updateAll?: unknown[]
} = {}): Db {
  const selectChain = makeChain({ get: opts.selectGet, all: opts.selectAll ?? [] })
  const db = {
    select: vi.fn(() => selectChain),
    insert: vi.fn(() => makeChain({ all: opts.insertAll ?? [] })),
    update: vi.fn(() => makeChain({ all: opts.updateAll ?? [] })),
    delete: vi.fn(() => makeChain()),
    transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(db))
  }
  return db as unknown as Db
}

// ── Test data ────────────────────────────────────────────────────────────────

const ENTRY: KnowledgeBaseEntry = {
  id: 1,
  title: 'Stop Placement Rules',
  content: 'Always place stop below the OB low',
  category: 'Stop Loss & Invalidation Logic',
  setupTypeId: 3,
  createdAt: '2026-05-27T12:00:00.000Z',
  updatedAt: '2026-05-27T12:00:00.000Z'
}

const ENTRY_2: KnowledgeBaseEntry = {
  id: 2,
  title: 'Session Bias',
  content: 'Only trade in the direction of HTF bias',
  category: 'HTF Bias & Draw on Liquidity',
  setupTypeId: null,
  createdAt: '2026-05-27T13:00:00.000Z',
  updatedAt: '2026-05-27T13:00:00.000Z'
}

// ── handleKnowledgeBaseList ──────────────────────────────────────────────────

describe('handleKnowledgeBaseList', () => {
  it('returns all entries ordered by updatedAt desc', () => {
    const db = makeDb({ selectAll: [ENTRY_2, ENTRY] })
    const result = handleKnowledgeBaseList(db)
    expect(result).toEqual({ success: true, data: [ENTRY_2, ENTRY] })
    expect(db.select).toHaveBeenCalledOnce()
    const chain = (db.select as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(chain.orderBy).toHaveBeenCalledOnce()
  })

  it('returns empty array when no entries exist', () => {
    const db = makeDb({ selectAll: [] })
    const result = handleKnowledgeBaseList(db)
    expect(result).toEqual({ success: true, data: [] })
  })

  it('passes category filter', () => {
    const db = makeDb({ selectAll: [ENTRY] })
    const result = handleKnowledgeBaseList(db, { category: 'Stop Loss & Invalidation Logic' })
    expect(result).toEqual({ success: true, data: [ENTRY] })
    const chain = (db.select as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(chain.where).toHaveBeenCalledOnce()
  })

  it('passes setupTypeId filter', () => {
    const db = makeDb({ selectAll: [ENTRY] })
    handleKnowledgeBaseList(db, { setupTypeId: 3 })
    const chain = (db.select as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(chain.where).toHaveBeenCalledOnce()
  })

  it('applies where clause when both filters provided', () => {
    const db = makeDb({ selectAll: [ENTRY] })
    handleKnowledgeBaseList(db, {
      category: 'Stop Loss & Invalidation Logic',
      setupTypeId: 3
    })
    const chain = (db.select as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(chain.where).toHaveBeenCalledOnce()
  })
})

// ── handleKnowledgeBaseGet ───────────────────────────────────────────────────

describe('handleKnowledgeBaseGet', () => {
  it('returns the entry for a valid id', () => {
    const db = makeDb({ selectGet: ENTRY })
    const result = handleKnowledgeBaseGet(db, { id: 1 })
    expect(result).toEqual({ success: true, data: ENTRY })
  })

  it('returns err when entry is not found', () => {
    const db = makeDb({ selectGet: undefined })
    const result = handleKnowledgeBaseGet(db, { id: 99 })
    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/99/)
  })
})

// ── handleKnowledgeBaseCreate ────────────────────────────────────────────────

describe('handleKnowledgeBaseCreate', () => {
  it('inserts an entry with all fields and returns it', () => {
    const db = makeDb({ insertAll: [ENTRY] })
    const result = handleKnowledgeBaseCreate(db, {
      title: ENTRY.title,
      content: ENTRY.content,
      category: ENTRY.category,
      setupTypeId: ENTRY.setupTypeId
    })
    expect(result).toEqual({ success: true, data: ENTRY })
    expect(db.insert).toHaveBeenCalledOnce()
  })

  it('inserts with nullable fields omitted, defaulting to null', () => {
    const db = makeDb({ insertAll: [{ ...ENTRY, category: null, setupTypeId: null }] })
    handleKnowledgeBaseCreate(db, { title: 'Test', content: 'Body' })
    const valuesCall = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value.values
    const [row] = valuesCall.mock.calls[0] as [Record<string, unknown>]
    expect(row.category).toBeNull()
    expect(row.setupTypeId).toBeNull()
  })

  it('sets createdAt and updatedAt timestamps', () => {
    const db = makeDb({ insertAll: [ENTRY] })
    handleKnowledgeBaseCreate(db, { title: 'Test', content: 'Body' })
    const valuesCall = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value.values
    const [row] = valuesCall.mock.calls[0] as [Record<string, unknown>]
    expect(typeof row.createdAt).toBe('string')
    expect(typeof row.updatedAt).toBe('string')
  })

  it('returns err for invalid category', () => {
    const db = makeDb({ insertAll: [] })
    const result = handleKnowledgeBaseCreate(db, {
      title: 'Test',
      content: 'Body',
      category: 'Not A Real Category'
    })
    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/Invalid category/)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('accepts null category without validation error', () => {
    const db = makeDb({ insertAll: [{ ...ENTRY, category: null }] })
    const result = handleKnowledgeBaseCreate(db, {
      title: 'Test',
      content: 'Body',
      category: null
    })
    expect(result.success).toBe(true)
    expect(db.insert).toHaveBeenCalledOnce()
  })
})

// ── handleKnowledgeBaseUpdate ────────────────────────────────────────────────

describe('handleKnowledgeBaseUpdate', () => {
  it('returns err when entry is not found', () => {
    const db = makeDb({ selectGet: undefined })
    const result = handleKnowledgeBaseUpdate(db, { id: 99, title: 'New' })
    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/99/)
  })

  it('partial update only touches provided fields', () => {
    const updated = { ...ENTRY, title: 'Updated Title' }
    const db = makeDb({ selectGet: ENTRY, updateAll: [updated] })
    const result = handleKnowledgeBaseUpdate(db, { id: 1, title: 'Updated Title' })
    expect(result).toEqual({ success: true, data: updated })
    const setCall = (db.update as ReturnType<typeof vi.fn>).mock.results[0].value.set
    const [setFields] = setCall.mock.calls[0] as [Record<string, unknown>]
    expect(setFields).toHaveProperty('title', 'Updated Title')
    expect(setFields).not.toHaveProperty('content')
    expect(setFields).not.toHaveProperty('category')
    expect(setFields).not.toHaveProperty('setupTypeId')
  })

  it('can set category to null explicitly', () => {
    const updated = { ...ENTRY, category: null }
    const db = makeDb({ selectGet: ENTRY, updateAll: [updated] })
    handleKnowledgeBaseUpdate(db, { id: 1, category: null })
    const setCall = (db.update as ReturnType<typeof vi.fn>).mock.results[0].value.set
    const [setFields] = setCall.mock.calls[0] as [Record<string, unknown>]
    expect(setFields).toHaveProperty('category', null)
  })

  it('can set setupTypeId to null explicitly', () => {
    const updated = { ...ENTRY, setupTypeId: null }
    const db = makeDb({ selectGet: ENTRY, updateAll: [updated] })
    handleKnowledgeBaseUpdate(db, { id: 1, setupTypeId: null })
    const setCall = (db.update as ReturnType<typeof vi.fn>).mock.results[0].value.set
    const [setFields] = setCall.mock.calls[0] as [Record<string, unknown>]
    expect(setFields).toHaveProperty('setupTypeId', null)
  })

  it('always updates updatedAt', () => {
    const db = makeDb({ selectGet: ENTRY, updateAll: [ENTRY] })
    handleKnowledgeBaseUpdate(db, { id: 1, title: 'New Title' })
    const setCall = (db.update as ReturnType<typeof vi.fn>).mock.results[0].value.set
    const [setFields] = setCall.mock.calls[0] as [Record<string, unknown>]
    expect(typeof setFields.updatedAt).toBe('string')
  })

  it('returns err for invalid category', () => {
    const db = makeDb({ selectGet: ENTRY })
    const result = handleKnowledgeBaseUpdate(db, { id: 1, category: 'Bogus Category' })
    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/Invalid category/)
    expect(db.update).not.toHaveBeenCalled()
  })
})

// ── handleKnowledgeBaseDelete ────────────────────────────────────────────────

describe('handleKnowledgeBaseDelete', () => {
  it('returns err when entry is not found', () => {
    const db = makeDb({ selectGet: undefined })
    const result = handleKnowledgeBaseDelete(db, { id: 99 })
    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/99/)
  })

  it('deletes the entry and returns ok', () => {
    const db = makeDb({ selectGet: ENTRY })
    const result = handleKnowledgeBaseDelete(db, { id: 1 })
    expect(result).toEqual({ success: true, data: undefined })
    expect(db.delete).toHaveBeenCalledOnce()
  })
})
