import { ipcMain } from 'electron'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { db, screenshotsPath } from '../db'
import { trades, setupTypes, strategyRules } from '../db/schema'
import type { IpcResult, TradeCreatePayload } from '../../shared/ipc-types'

function ok<T>(data: T): IpcResult<T> {
  return { success: true, data }
}

function err(message: string): IpcResult<never> {
  return { success: false, error: message }
}

function now(): string {
  return new Date().toISOString()
}

export function registerHandlers(): void {
  // ── trades ────────────────────────────────────────────────────────────────

  ipcMain.handle('trade:create', (_e, payload) => {
    try {
      const { screenshotData, ...tradeFields } = payload as TradeCreatePayload
      const ts = now()

      const [inserted] = db
        .insert(trades)
        .values({
          instrument: tradeFields.instrument,
          direction: tradeFields.direction,
          entryPrice: tradeFields.entryPrice,
          exitPrice: tradeFields.exitPrice,
          entryTime: tradeFields.entryTime,
          exitTime: tradeFields.exitTime,
          session: tradeFields.session,
          setupTypeId: tradeFields.setupTypeId,
          outcome: tradeFields.outcome,
          pnl: tradeFields.pnl,
          notes: tradeFields.notes,
          screenshotPath: null,
          createdAt: ts,
          updatedAt: ts
        })
        .returning()
        .all()

      if (!inserted) return err('Insert returned no row')

      if (screenshotData) {
        try {
          const localDate = new Date(inserted.entryTime).toLocaleDateString('en-CA')
          const filename = `${localDate}_${inserted.id}.png`
          writeFileSync(join(screenshotsPath, filename), Buffer.from(screenshotData, 'base64'))

          const [withShot] = db
            .update(trades)
            .set({ screenshotPath: filename, updatedAt: now() })
            .where(eq(trades.id, inserted.id))
            .returning()
            .all()

          return ok(withShot)
        } catch {
          db.delete(trades).where(eq(trades.id, inserted.id)).run()
          return err('Failed to write screenshot — trade not saved')
        }
      }

      return ok(inserted)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  ipcMain.handle('trade:list', (_e, payload) => {
    try {
      const filters = (payload ?? {}) as {
        instrument?: string
        session?: string
        setupTypeId?: number
        outcome?: string
        dateFrom?: string
        dateTo?: string
      }

      const conditions = [
        filters.instrument ? eq(trades.instrument, filters.instrument) : undefined,
        filters.session ? eq(trades.session, filters.session) : undefined,
        filters.setupTypeId != null ? eq(trades.setupTypeId, filters.setupTypeId) : undefined,
        filters.outcome ? eq(trades.outcome, filters.outcome) : undefined,
        filters.dateFrom ? gte(trades.entryTime, filters.dateFrom) : undefined,
        filters.dateTo ? lte(trades.entryTime, filters.dateTo) : undefined
      ].filter((c): c is NonNullable<typeof c> => c !== undefined)

      const rows =
        conditions.length > 0
          ? db.select().from(trades).where(and(...conditions)).all()
          : db.select().from(trades).all()

      return ok(rows)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  ipcMain.handle('trade:get', (_e, payload) => {
    try {
      const { id } = payload as { id: number }
      const row = db.select().from(trades).where(eq(trades.id, id)).get()
      if (!row) return err(`Trade ${id} not found`)
      return ok(row)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  ipcMain.handle('trade:update', (_e, payload) => {
    try {
      const { id, ...fields } = payload as { id: number } & Partial<{
        instrument: string
        direction: string
        entryPrice: number
        exitPrice: number
        entryTime: string
        exitTime: string
        session: string
        setupTypeId: number
        outcome: string
        pnl: number
        notes: string
        screenshotPath: string | null
      }>
      const [updated] = db
        .update(trades)
        .set({ ...fields, updatedAt: now() })
        .where(eq(trades.id, id))
        .returning()
        .all()
      if (!updated) return err(`Trade ${id} not found`)
      return ok(updated)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  ipcMain.handle('trade:delete', (_e, payload) => {
    try {
      const { id } = payload as { id: number }
      const existing = db.select().from(trades).where(eq(trades.id, id)).get()
      if (!existing) return err(`Trade ${id} not found`)

      if (existing.screenshotPath) {
        try {
          unlinkSync(join(screenshotsPath, existing.screenshotPath))
        } catch {
          // Missing file on disk is not fatal — proceed with DB delete
        }
      }

      db.delete(trades).where(eq(trades.id, id)).run()
      return ok(undefined)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  // ── setup types ───────────────────────────────────────────────────────────

  ipcMain.handle('setup-type:list', () => {
    try {
      return ok(db.select().from(setupTypes).all())
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  ipcMain.handle('setup-type:create', (_e, payload) => {
    try {
      const { name } = payload as { name: string }
      const ts = now()

      const [inserted] = db
        .insert(setupTypes)
        .values({ name, createdAt: ts, updatedAt: ts })
        .returning()
        .all()

      if (!inserted) return err('Insert returned no row')

      // Create the paired strategy_rules row with empty fields
      db.insert(strategyRules)
        .values({
          setupTypeId: inserted.id,
          entryCriteria: '',
          htfConfirmation: '',
          validVsPremature: '',
          sessionFilter: '',
          freeformNotes: '',
          createdAt: ts,
          updatedAt: ts
        })
        .run()

      return ok(inserted)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  ipcMain.handle('setup-type:update', (_e, payload) => {
    try {
      const { id, name } = payload as { id: number; name: string }
      const [updated] = db
        .update(setupTypes)
        .set({ name, updatedAt: now() })
        .where(eq(setupTypes.id, id))
        .returning()
        .all()
      if (!updated) return err(`Setup type ${id} not found`)
      return ok(updated)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  ipcMain.handle('setup-type:delete', (_e, payload) => {
    try {
      const { id } = payload as { id: number }

      const existing = db.select().from(setupTypes).where(eq(setupTypes.id, id)).get()
      if (!existing) return err(`Setup type ${id} not found`)

      const [{ count }] = db
        .select({ count: sql<number>`count(*)` })
        .from(trades)
        .where(eq(trades.setupTypeId, id))
        .all()

      if (count > 0) {
        return err(
          `"${existing.name}" is referenced by ${count} trade${count === 1 ? '' : 's'} and cannot be deleted. Rename it instead, or reassign those trades first.`
        )
      }

      db.delete(strategyRules).where(eq(strategyRules.setupTypeId, id)).run()
      db.delete(setupTypes).where(eq(setupTypes.id, id)).run()
      return ok(undefined)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  // ── strategy rules ────────────────────────────────────────────────────────

  ipcMain.handle('strategy-rules:get', (_e, payload) => {
    try {
      const { setupTypeId } = payload as { setupTypeId: number }
      const row = db
        .select()
        .from(strategyRules)
        .where(eq(strategyRules.setupTypeId, setupTypeId))
        .get()
      if (!row) return err(`No strategy rules found for setup type ${setupTypeId}`)
      return ok(row)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  ipcMain.handle('strategy-rules:upsert', (_e, payload) => {
    try {
      const {
        setupTypeId,
        entryCriteria,
        htfConfirmation,
        validVsPremature,
        sessionFilter,
        freeformNotes
      } = payload as {
        setupTypeId: number
        entryCriteria: string
        htfConfirmation: string
        validVsPremature: string
        sessionFilter: string
        freeformNotes: string
      }

      const ts = now()
      const existing = db
        .select()
        .from(strategyRules)
        .where(eq(strategyRules.setupTypeId, setupTypeId))
        .get()

      if (existing) {
        const [updated] = db
          .update(strategyRules)
          .set({ entryCriteria, htfConfirmation, validVsPremature, sessionFilter, freeformNotes, updatedAt: ts })
          .where(eq(strategyRules.setupTypeId, setupTypeId))
          .returning()
          .all()
        return ok(updated)
      }

      const [inserted] = db
        .insert(strategyRules)
        .values({
          setupTypeId,
          entryCriteria,
          htfConfirmation,
          validVsPremature,
          sessionFilter,
          freeformNotes,
          createdAt: ts,
          updatedAt: ts
        })
        .returning()
        .all()
      return ok(inserted)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })
}
