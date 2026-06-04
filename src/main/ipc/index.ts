import { ipcMain, BrowserWindow } from 'electron'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'
import { eq, and, gte, lte, sql, isNull } from 'drizzle-orm'
import { db, screenshotsPath } from '../db'
import { trades, setupTypes, strategyRules, knowledgeBaseEntries } from '../db/schema'
import type { IpcResult, TradeCreatePayload } from '../../shared/ipc-types'
import { computePnl, deriveOutcome } from '../../shared/constants'
import type { Instrument, Direction } from '../../shared/constants'
import {
  handleImportEnqueue,
  handleImportList,
  handleImportGet,
  handleImportUpdate,
  handleImportConfirm,
  handleImportReject
} from './import-handlers'
import { handleImportFromCsv } from './import-csv-handler'
import {
  handleKnowledgeBaseList,
  handleKnowledgeBaseGet,
  handleKnowledgeBaseCreate,
  handleKnowledgeBaseUpdate,
  handleKnowledgeBaseDelete
} from './knowledge-base-handlers'
import {
  handleApiKeySave,
  handleApiKeyClear,
  handleApiKeyExists
} from './api-key-handlers'
import { apiKeyStore } from '../security/api-key-store'
import Anthropic from '@anthropic-ai/sdk'
import { createReviewer } from '../ai/review'

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
      const pnl = computePnl(
        tradeFields.instrument as Instrument,
        tradeFields.direction as Direction,
        tradeFields.entryPrice,
        tradeFields.exitPrice,
        tradeFields.quantity ?? 1
      )
      const outcome = deriveOutcome(pnl)

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
          quantity: tradeFields.quantity ?? 1,
          outcome,
          pnl,
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
        quantity: number
        notes: string
        screenshotPath: string | null
      }>

      const existing = db.select().from(trades).where(eq(trades.id, id)).get()
      if (!existing) return err(`Trade ${id} not found`)

      const merged = { ...existing, ...fields }
      const pnl = computePnl(
        merged.instrument as Instrument,
        merged.direction as Direction,
        merged.entryPrice,
        merged.exitPrice,
        merged.quantity
      )
      const outcome = deriveOutcome(pnl)

      const [updated] = db
        .update(trades)
        .set({ ...fields, pnl, outcome, updatedAt: now() })
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

      db.update(knowledgeBaseEntries)
        .set({ setupTypeId: null, updatedAt: now() })
        .where(eq(knowledgeBaseEntries.setupTypeId, id))
        .run()

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

  // ── screenshots ───────────────────────────────────────────────────────────

  // ── imports ───────────────────────────────────────────────────────────────

  ipcMain.handle('import:from-csv', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return handleImportFromCsv(db, win)
  })
  ipcMain.handle('import:enqueue', (_e, payload) => handleImportEnqueue(db, payload))
  ipcMain.handle('import:list', () => handleImportList(db))
  ipcMain.handle('import:get', (_e, payload) => handleImportGet(db, payload))
  ipcMain.handle('import:update', (_e, payload) => handleImportUpdate(db, screenshotsPath, payload))
  ipcMain.handle('import:confirm', (_e, payload) => handleImportConfirm(db, payload))
  ipcMain.handle('import:reject', (_e, payload) => handleImportReject(db, screenshotsPath, payload))

  // ── screenshots ───────────────────────────────────────────────────────────

  // ── knowledge base ─────────────────────────────────────────────────────────

  ipcMain.handle('knowledge-base:list', (_e, payload) => handleKnowledgeBaseList(db, payload))
  ipcMain.handle('knowledge-base:get', (_e, payload) => handleKnowledgeBaseGet(db, payload))
  ipcMain.handle('knowledge-base:create', (_e, payload) => handleKnowledgeBaseCreate(db, payload))
  ipcMain.handle('knowledge-base:update', (_e, payload) => handleKnowledgeBaseUpdate(db, payload))
  ipcMain.handle('knowledge-base:delete', (_e, payload) => handleKnowledgeBaseDelete(db, payload))

  // ── screenshots ───────────────────────────────────────────────────────────

  ipcMain.handle('screenshot:load', (_e, payload) => {
    try {
      const { filename } = payload as { filename: string }
      try {
        const buffer = readFileSync(join(screenshotsPath, filename))
        return ok(`data:image/png;base64,${buffer.toString('base64')}`)
      } catch {
        return ok(null)
      }
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error')
    }
  })

  // ── api key ───────────────────────────────────────────────────────────────

  ipcMain.handle('api-key:save', (_e, payload) => handleApiKeySave(apiKeyStore, payload))
  ipcMain.handle('api-key:clear', () => handleApiKeyClear(apiKeyStore))
  ipcMain.handle('api-key:exists', () => handleApiKeyExists(apiKeyStore))

  // ── ai review ─────────────────────────────────────────────────────────────

  ipcMain.handle('ai:review-trade', async (_e, payload) => {
    try {
      const { tradeId } = payload as { tradeId: number }

      const apiKey = apiKeyStore.loadApiKey()
      if (!apiKey) return err('No API key configured. Add your Anthropic API key in Settings.')

      const trade = db.select().from(trades).where(eq(trades.id, tradeId)).get()
      if (!trade) return err(`Trade ${tradeId} not found`)

      const setupType = db.select().from(setupTypes).where(eq(setupTypes.id, trade.setupTypeId)).get()
      const setupName = setupType?.name ?? 'Unknown Setup'

      const rules = db
        .select()
        .from(strategyRules)
        .where(eq(strategyRules.setupTypeId, trade.setupTypeId))
        .get()
      if (!rules) return err(`No strategy rules found for setup type ${trade.setupTypeId}`)

      const globalKbEntries = db
        .select()
        .from(knowledgeBaseEntries)
        .where(isNull(knowledgeBaseEntries.setupTypeId))
        .all()

      const setupKbEntries = db
        .select()
        .from(knowledgeBaseEntries)
        .where(eq(knowledgeBaseEntries.setupTypeId, trade.setupTypeId))
        .all()

      const client = new Anthropic({ apiKey })
      const reviewer = createReviewer(client.messages)
      const result = await reviewer.reviewTrade({ trade, setupName, rules, globalKbEntries, setupKbEntries })

      if (!result.ok) return err(result.error)

      const reviewCreatedAt = now()
      db.update(trades)
        .set({ review: result.review, reviewCreatedAt, updatedAt: reviewCreatedAt })
        .where(eq(trades.id, tradeId))
        .run()

      return ok({ review: result.review, reviewCreatedAt })
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error during review')
    }
  })
}
