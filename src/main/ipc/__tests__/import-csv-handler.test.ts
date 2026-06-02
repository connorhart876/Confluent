import { describe, it, expect, vi } from 'vitest'

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn()
}))

import { processCsvContent } from '../import-csv-handler'
import type { Db } from '../../db'
import type { PendingImport } from '../../../shared/ipc-types'

// ── Mock DB factory (matches pattern from import-handlers.test.ts) ───────────

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

function makeDb(opts: { insertAll?: unknown[] } = {}): Db {
  const db = {
    select: vi.fn(() => makeChain()),
    insert: vi.fn(() => makeChain({ all: opts.insertAll ?? [] })),
    update: vi.fn(() => makeChain()),
    delete: vi.fn(() => makeChain()),
    transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(db))
  }
  return db as unknown as Db
}

// ── CSV fixtures ─────────────────────────────────────────────────────────────
// Parser expects Tradovate format: MM/DD/YYYY HH:MM:SS timestamps, "Filled" status

const VALID_CSV = `B/S,Product,Avg Fill Price,Filled Qty,Fill Time,Status
Buy,MNQ,21000,2,05/27/2026 14:30:00,Filled
Sell,MNQ,21050,2,05/27/2026 14:45:00,Filled`

// One valid pair + one row with missing price (error)
const PARTIAL_CSV = `B/S,Product,Avg Fill Price,Filled Qty,Fill Time,Status
Buy,MNQ,21000,2,05/27/2026 14:30:00,Filled
Sell,MNQ,21050,2,05/27/2026 14:45:00,Filled
Buy,MNQ,,1,05/27/2026 15:00:00,Filled`

const EMPTY_CSV = ``

const ALL_INVALID_CSV = `B/S,Product,Avg Fill Price,Filled Qty,Fill Time,Status
Buy,MNQ,,1,05/27/2026 14:30:00,Filled
Sell,INVALID,21000,1,05/27/2026 14:45:00,Filled`

const MISSING_COLUMNS_CSV = `foo,bar
1,2`

// ── Shared pending row shape ──────────────────────────────────────────────────

const PENDING_ROW: PendingImport = {
  id: 1,
  instrument: 'MNQ',
  direction: 'Long',
  entryPrice: 21000,
  exitPrice: 21050,
  entryTime: '2026-05-27T14:30:00.000Z',
  exitTime: '2026-05-27T14:45:00.000Z',
  quantity: 2,
  pnl: 100,
  outcome: 'Win',
  session: null,
  setupTypeId: null,
  notes: null,
  screenshotPath: null,
  createdAt: '2026-05-27T15:00:00.000Z',
  updatedAt: '2026-05-27T15:00:00.000Z'
}

// ── processCsvContent ─────────────────────────────────────────────────────────

describe('processCsvContent', () => {
  it('enqueues parsed trades and returns summary on valid CSV', () => {
    const db = makeDb({ insertAll: [PENDING_ROW] })
    const result = processCsvContent(db, VALID_CSV, '/path/Orders.csv')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.cancelled).toBe(false)
    expect(result.data.filePath).toBe('/path/Orders.csv')
    expect(result.data.enqueuedCount).toBe(1)
    expect(result.data.parseErrors).toHaveLength(0)
    expect(result.data.summary).not.toBeNull()
    expect(result.data.summary?.pairedTrades).toBe(1)
    expect(db.insert).toHaveBeenCalledOnce()
  })

  it('returns enqueuedCount 0 and no errors for empty CSV', () => {
    const db = makeDb()
    const result = processCsvContent(db, EMPTY_CSV, '/path/empty.csv')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.enqueuedCount).toBe(0)
    expect(result.data.parseErrors).toHaveLength(0)
    expect(result.data.summary?.totalRows).toBe(0)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('returns enqueuedCount 0 and populated parseErrors when all rows are invalid', () => {
    const db = makeDb()
    const result = processCsvContent(db, ALL_INVALID_CSV, '/path/bad.csv')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.enqueuedCount).toBe(0)
    expect(result.data.parseErrors.length).toBeGreaterThan(0)
    expect(result.data.parseErrors[0]).toHaveProperty('row')
    expect(result.data.parseErrors[0]).toHaveProperty('reason')
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('enqueues valid rows and reports errors for the invalid rows', () => {
    const db = makeDb({ insertAll: [PENDING_ROW] })
    const result = processCsvContent(db, PARTIAL_CSV, '/path/partial.csv')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.enqueuedCount).toBe(1)
    expect(result.data.parseErrors.length).toBeGreaterThan(0)
    expect(db.insert).toHaveBeenCalledOnce()
  })

  it('returns an error envelope when parser throws on missing required columns', () => {
    const db = makeDb()
    const result = processCsvContent(db, MISSING_COLUMNS_CSV, '/path/wrong.csv')

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toMatch(/Invalid CSV/)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('parseErrors omit the raw row object (only row + reason)', () => {
    const db = makeDb()
    const result = processCsvContent(db, ALL_INVALID_CSV, '/path/bad.csv')

    expect(result.success).toBe(true)
    if (!result.success) return
    for (const e of result.data.parseErrors) {
      expect(Object.keys(e)).toEqual(['row', 'reason'])
    }
  })

  it('bubbles the error envelope when handleImportEnqueue returns success: false', () => {
    // Simulate DB failure by making the insert.all() return empty and transaction fail
    const db = makeDb({ insertAll: [] })
    // Override transaction to simulate enqueue returning err
    ;(db.transaction as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('DB locked')
    })
    const result = processCsvContent(db, VALID_CSV, '/path/Orders.csv')

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toMatch(/DB locked/)
  })
})
