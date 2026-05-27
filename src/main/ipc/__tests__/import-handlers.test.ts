import { describe, it, expect, vi } from 'vitest'

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn()
}))

import { writeFileSync, unlinkSync } from 'fs'
import {
  handleImportEnqueue,
  handleImportList,
  handleImportGet,
  handleImportUpdate,
  handleImportConfirm,
  handleImportReject
} from '../import-handlers'
import type { Db } from '../../db'
import type { PendingImport, Trade } from '../../../shared/ipc-types'

// ── Mock DB factory ─────────────────────────────────────────────────────────
//
// Creates a fluent drizzle-like mock where chain methods return `this`
// and terminal methods return configurable values.

function makeChain(opts: { get?: unknown; all?: unknown[] } = {}) {
  const c = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
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
  insertAll?: unknown[]
  updateAll?: unknown[]
} = {}): Db {
  const db = {
    select: vi.fn(() => makeChain({ get: opts.selectGet })),
    insert: vi.fn(() => makeChain({ all: opts.insertAll ?? [] })),
    update: vi.fn(() => makeChain({ all: opts.updateAll ?? [] })),
    delete: vi.fn(() => makeChain()),
    transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(db))
  }
  return db as unknown as Db
}

// ── Test data ────────────────────────────────────────────────────────────────

const CSV_TRADE = {
  instrument: 'MNQ',
  direction: 'Long',
  entryPrice: 21000,
  exitPrice: 21050,
  entryTime: '2026-05-27T14:30:00.000Z',
  exitTime: '2026-05-27T14:45:00.000Z',
  quantity: 2,
  pnl: 200,
  outcome: 'Win'
}

const PENDING_ROW: PendingImport = {
  id: 1,
  ...CSV_TRADE,
  session: null,
  setupTypeId: null,
  notes: null,
  screenshotPath: null,
  createdAt: '2026-05-27T15:00:00.000Z',
  updatedAt: '2026-05-27T15:00:00.000Z'
}

const PENDING_ROW_READY: PendingImport = {
  ...PENDING_ROW,
  session: 'NY AM',
  setupTypeId: 3
}

const CONFIRMED_TRADE: Trade = {
  id: 99,
  ...CSV_TRADE,
  session: 'NY AM',
  setupTypeId: 3,
  notes: '',
  screenshotPath: null,
  createdAt: '2026-05-27T15:01:00.000Z',
  updatedAt: '2026-05-27T15:01:00.000Z'
}

// ── handleImportEnqueue ──────────────────────────────────────────────────────

describe('handleImportEnqueue', () => {
  it('returns err for empty array', () => {
    const db = makeDb()
    const result = handleImportEnqueue(db, [])
    expect(result).toEqual({ success: false, error: 'No trades to enqueue' })
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('inserts all trades in a transaction and returns them', () => {
    const inserted = [{ ...PENDING_ROW, id: 1 }, { ...PENDING_ROW, id: 2 }]
    const db = makeDb({ insertAll: inserted })
    const result = handleImportEnqueue(db, [CSV_TRADE, CSV_TRADE])
    expect(result).toEqual({ success: true, data: inserted })
    expect(db.transaction).toHaveBeenCalledOnce()
  })

  it('sets user-assigned fields to null on insert', () => {
    const db = makeDb({ insertAll: [PENDING_ROW] })
    handleImportEnqueue(db, [CSV_TRADE])
    const valuesCall = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value.values
    const [rows] = valuesCall.mock.calls[0] as [Array<Record<string, unknown>>]
    expect(rows[0].session).toBeNull()
    expect(rows[0].setupTypeId).toBeNull()
    expect(rows[0].notes).toBeNull()
    expect(rows[0].screenshotPath).toBeNull()
  })
})

// ── handleImportList ─────────────────────────────────────────────────────────

describe('handleImportList', () => {
  it('returns all pending imports', () => {
    const db = makeDb()
    // Patch the select chain to return a list via all()
    const listChain = makeChain({ get: undefined })
    listChain.all = vi.fn(() => [PENDING_ROW])
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(listChain)

    const result = handleImportList(db)
    expect(result).toEqual({ success: true, data: [PENDING_ROW] })
  })

  it('returns empty array when no pending imports exist', () => {
    const db = makeDb()
    const result = handleImportList(db)
    expect(result).toEqual({ success: true, data: [] })
  })
})

// ── handleImportGet ──────────────────────────────────────────────────────────

describe('handleImportGet', () => {
  it('returns the pending import for a valid id', () => {
    const db = makeDb({ selectGet: PENDING_ROW })
    const result = handleImportGet(db, { id: 1 })
    expect(result).toEqual({ success: true, data: PENDING_ROW })
  })

  it('returns err when pending import is not found', () => {
    const db = makeDb({ selectGet: undefined })
    const result = handleImportGet(db, { id: 99 })
    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/99/)
  })
})

// ── handleImportUpdate ───────────────────────────────────────────────────────

describe('handleImportUpdate', () => {
  it('returns err when pending import is not found', () => {
    const db = makeDb({ selectGet: undefined })
    const result = handleImportUpdate(db, '/tmp', { id: 99, session: 'NY AM' })
    expect(result.success).toBe(false)
  })

  it('updates only user-assigned fields', () => {
    const updated = { ...PENDING_ROW, session: 'NY AM', updatedAt: expect.any(String) }
    const db = makeDb({ selectGet: PENDING_ROW, updateAll: [updated] })
    const result = handleImportUpdate(db, '/tmp', { id: 1, session: 'NY AM' })
    expect(result).toEqual({ success: true, data: updated })
  })

  it('does not include screenshotData in the db update fields', () => {
    const updated = { ...PENDING_ROW, screenshotPath: 'pending_2026-05-27_1.png' }
    const db = makeDb({ selectGet: PENDING_ROW, updateAll: [updated] })
    vi.mocked(writeFileSync).mockClear()

    handleImportUpdate(db, '/screenshots', {
      id: 1,
      screenshotData: 'base64data'
    })

    const setCall = (db.update as ReturnType<typeof vi.fn>).mock.results[0].value.set
    const [setFields] = setCall.mock.calls[0] as [Record<string, unknown>]
    expect(setFields).not.toHaveProperty('screenshotData')
    expect(setFields).toHaveProperty('screenshotPath')
    expect(writeFileSync).toHaveBeenCalledOnce()
  })
})

// ── handleImportConfirm ──────────────────────────────────────────────────────

describe('handleImportConfirm', () => {
  it('returns err when pending import is not found', () => {
    const db = makeDb({ selectGet: undefined })
    const result = handleImportConfirm(db, { id: 1 })
    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/1/)
  })

  it('returns err when session is null', () => {
    const db = makeDb({ selectGet: { ...PENDING_ROW, session: null, setupTypeId: 3 } })
    const result = handleImportConfirm(db, { id: 1 })
    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/session/)
  })

  it('returns err when setupTypeId is null', () => {
    const db = makeDb({ selectGet: { ...PENDING_ROW, session: 'NY AM', setupTypeId: null } })
    const result = handleImportConfirm(db, { id: 1 })
    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/setup type/)
  })

  it('returns err when both session and setupTypeId are null', () => {
    const db = makeDb({ selectGet: PENDING_ROW })
    const result = handleImportConfirm(db, { id: 1 })
    expect(result.success).toBe(false)
    const msg = (result as { success: false; error: string }).error
    expect(msg).toMatch(/session/)
    expect(msg).toMatch(/setup type/)
  })

  it('confirms a ready pending import and returns the created trade', () => {
    const db = makeDb({ selectGet: PENDING_ROW_READY, insertAll: [CONFIRMED_TRADE] })
    const result = handleImportConfirm(db, { id: 1 })
    expect(result).toEqual({ success: true, data: CONFIRMED_TRADE })
    expect(db.transaction).toHaveBeenCalledOnce()
  })

  it('coerces null notes to empty string on the created trade', () => {
    const db = makeDb({ selectGet: PENDING_ROW_READY, insertAll: [CONFIRMED_TRADE] })
    handleImportConfirm(db, { id: 1 })
    const insertValues = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value.values
    const [row] = insertValues.mock.calls[0] as [Record<string, unknown>]
    expect(row.notes).toBe('')
  })

  it('trusts parser-computed pnl and outcome without re-computing', () => {
    const db = makeDb({ selectGet: PENDING_ROW_READY, insertAll: [CONFIRMED_TRADE] })
    handleImportConfirm(db, { id: 1 })
    const insertValues = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value.values
    const [row] = insertValues.mock.calls[0] as [Record<string, unknown>]
    expect(row.pnl).toBe(CSV_TRADE.pnl)
    expect(row.outcome).toBe(CSV_TRADE.outcome)
  })

  it('deletes the pending import inside the same transaction', () => {
    const db = makeDb({ selectGet: PENDING_ROW_READY, insertAll: [CONFIRMED_TRADE] })
    handleImportConfirm(db, { id: 1 })
    expect(db.delete).toHaveBeenCalledOnce()
    expect(db.transaction).toHaveBeenCalledOnce()
  })
})

// ── handleImportReject ───────────────────────────────────────────────────────

describe('handleImportReject', () => {
  it('returns err when pending import is not found', () => {
    const db = makeDb({ selectGet: undefined })
    const result = handleImportReject(db, '/tmp', { id: 99 })
    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/99/)
  })

  it('deletes the pending import and returns ok', () => {
    const db = makeDb({ selectGet: PENDING_ROW })
    const result = handleImportReject(db, '/tmp', { id: 1 })
    expect(result).toEqual({ success: true, data: undefined })
    expect(db.delete).toHaveBeenCalledOnce()
  })

  it('does not attempt file deletion when screenshotPath is null', () => {
    const db = makeDb({ selectGet: { ...PENDING_ROW, screenshotPath: null } })
    vi.mocked(unlinkSync).mockClear()
    handleImportReject(db, '/tmp', { id: 1 })
    expect(unlinkSync).not.toHaveBeenCalled()
  })

  it('attempts file deletion when screenshotPath is set, tolerates missing file', () => {
    const db = makeDb({ selectGet: { ...PENDING_ROW, screenshotPath: 'pending_2026-05-27_1.png' } })
    vi.mocked(unlinkSync).mockImplementation(() => { throw new Error('ENOENT') })
    const result = handleImportReject(db, '/screenshots', { id: 1 })
    expect(result.success).toBe(true)
    expect(unlinkSync).toHaveBeenCalledOnce()
  })
})
