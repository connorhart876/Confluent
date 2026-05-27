import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import type { Db } from '../db'
import { trades, pendingImports } from '../db/schema'
import type { IpcResult, PendingImportEnqueuePayload, PendingImportUpdatePayload } from '../../shared/ipc-types'
import type { Trade, PendingImport } from '../../shared/ipc-types'

function ok<T>(data: T): IpcResult<T> {
  return { success: true, data }
}

function err(message: string): IpcResult<never> {
  return { success: false, error: message }
}

function now(): string {
  return new Date().toISOString()
}

export function handleImportEnqueue(
  db: Db,
  payload: PendingImportEnqueuePayload[]
): IpcResult<PendingImport[]> {
  try {
    if (!payload.length) return err('No trades to enqueue')

    const ts = now()
    const rows = payload.map((t) => ({
      instrument: t.instrument,
      direction: t.direction,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      quantity: t.quantity,
      pnl: t.pnl,
      outcome: t.outcome,
      session: null,
      setupTypeId: null,
      notes: null,
      screenshotPath: null,
      createdAt: ts,
      updatedAt: ts
    }))

    const inserted = db.transaction((tx) =>
      tx.insert(pendingImports).values(rows).returning().all()
    )

    return ok(inserted)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export function handleImportList(db: Db): IpcResult<PendingImport[]> {
  try {
    return ok(db.select().from(pendingImports).all())
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export function handleImportGet(db: Db, payload: { id: number }): IpcResult<PendingImport> {
  try {
    const row = db.select().from(pendingImports).where(eq(pendingImports.id, payload.id)).get()
    if (!row) return err(`Pending import ${payload.id} not found`)
    return ok(row)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export function handleImportUpdate(
  db: Db,
  screenshotsPath: string,
  payload: PendingImportUpdatePayload
): IpcResult<PendingImport> {
  try {
    const { id, session, setupTypeId, notes, screenshotPath, screenshotData } = payload

    const existing = db.select().from(pendingImports).where(eq(pendingImports.id, id)).get()
    if (!existing) return err(`Pending import ${id} not found`)

    const updates: Record<string, unknown> = { updatedAt: now() }

    if (session !== undefined) updates.session = session
    if (setupTypeId !== undefined) updates.setupTypeId = setupTypeId
    if (notes !== undefined) updates.notes = notes

    if (screenshotData) {
      const localDate = new Date(existing.entryTime).toLocaleDateString('en-CA')
      const filename = `pending_${localDate}_${id}.png`
      writeFileSync(join(screenshotsPath, filename), Buffer.from(screenshotData, 'base64'))
      updates.screenshotPath = filename
    } else if (screenshotPath !== undefined) {
      updates.screenshotPath = screenshotPath
    }

    const [updated] = db
      .update(pendingImports)
      .set(updates)
      .where(eq(pendingImports.id, id))
      .returning()
      .all()

    if (!updated) return err(`Pending import ${id} not found`)
    return ok(updated)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export function handleImportConfirm(db: Db, payload: { id: number }): IpcResult<Trade> {
  try {
    const { id } = payload

    const pending = db.select().from(pendingImports).where(eq(pendingImports.id, id)).get()
    if (!pending) return err(`Pending import ${id} not found`)

    const missing: string[] = []
    if (!pending.session) missing.push('session')
    if (pending.setupTypeId == null) missing.push('setup type')
    if (missing.length > 0) {
      return err(`Cannot confirm: missing ${missing.join(', ')}`)
    }

    const ts = now()
    const trade = db.transaction((tx) => {
      const [inserted] = tx
        .insert(trades)
        .values({
          instrument: pending.instrument,
          direction: pending.direction,
          entryPrice: pending.entryPrice,
          exitPrice: pending.exitPrice,
          entryTime: pending.entryTime,
          exitTime: pending.exitTime,
          quantity: pending.quantity,
          pnl: pending.pnl,
          outcome: pending.outcome,
          session: pending.session!,
          setupTypeId: pending.setupTypeId!,
          notes: pending.notes ?? '',
          screenshotPath: pending.screenshotPath,
          createdAt: ts,
          updatedAt: ts
        })
        .returning()
        .all()

      tx.delete(pendingImports).where(eq(pendingImports.id, id)).run()

      return inserted
    })

    return ok(trade)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export function handleImportReject(
  db: Db,
  screenshotsPath: string,
  payload: { id: number }
): IpcResult<void> {
  try {
    const { id } = payload

    const existing = db.select().from(pendingImports).where(eq(pendingImports.id, id)).get()
    if (!existing) return err(`Pending import ${id} not found`)

    if (existing.screenshotPath) {
      try {
        unlinkSync(join(screenshotsPath, existing.screenshotPath))
      } catch {
        // Missing file on disk is not fatal
      }
    }

    db.delete(pendingImports).where(eq(pendingImports.id, id)).run()
    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}
