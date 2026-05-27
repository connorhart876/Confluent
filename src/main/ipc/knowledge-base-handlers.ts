import { eq, and, desc } from 'drizzle-orm'
import type { Db } from '../db'
import { knowledgeBaseEntries } from '../db/schema'
import { KB_CATEGORIES } from '../../shared/constants'
import type {
  IpcResult,
  KnowledgeBaseCreatePayload,
  KnowledgeBaseUpdatePayload,
  KnowledgeBaseListPayload,
  KnowledgeBaseEntry
} from '../../shared/ipc-types'

function ok<T>(data: T): IpcResult<T> {
  return { success: true, data }
}

function err(message: string): IpcResult<never> {
  return { success: false, error: message }
}

function now(): string {
  return new Date().toISOString()
}

function isValidCategory(category: string): boolean {
  return (KB_CATEGORIES as readonly string[]).includes(category)
}

export function handleKnowledgeBaseList(
  db: Db,
  payload?: KnowledgeBaseListPayload | void
): IpcResult<KnowledgeBaseEntry[]> {
  try {
    const filters = (payload ?? {}) as KnowledgeBaseListPayload

    const conditions = [
      filters.category ? eq(knowledgeBaseEntries.category, filters.category) : undefined,
      filters.setupTypeId != null
        ? eq(knowledgeBaseEntries.setupTypeId, filters.setupTypeId)
        : undefined
    ].filter((c): c is NonNullable<typeof c> => c !== undefined)

    const rows =
      conditions.length > 0
        ? db
            .select()
            .from(knowledgeBaseEntries)
            .where(and(...conditions))
            .orderBy(desc(knowledgeBaseEntries.updatedAt))
            .all()
        : db.select().from(knowledgeBaseEntries).orderBy(desc(knowledgeBaseEntries.updatedAt)).all()

    return ok(rows)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export function handleKnowledgeBaseGet(
  db: Db,
  payload: { id: number }
): IpcResult<KnowledgeBaseEntry> {
  try {
    const row = db
      .select()
      .from(knowledgeBaseEntries)
      .where(eq(knowledgeBaseEntries.id, payload.id))
      .get()
    if (!row) return err(`Knowledge base entry ${payload.id} not found`)
    return ok(row)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export function handleKnowledgeBaseCreate(
  db: Db,
  payload: KnowledgeBaseCreatePayload
): IpcResult<KnowledgeBaseEntry> {
  try {
    if (payload.category != null && !isValidCategory(payload.category)) {
      return err(
        `Invalid category "${payload.category}". Must be one of: ${KB_CATEGORIES.join(', ')}`
      )
    }

    const ts = now()
    const [inserted] = db
      .insert(knowledgeBaseEntries)
      .values({
        title: payload.title,
        content: payload.content,
        category: payload.category ?? null,
        setupTypeId: payload.setupTypeId ?? null,
        createdAt: ts,
        updatedAt: ts
      })
      .returning()
      .all()

    if (!inserted) return err('Insert returned no row')
    return ok(inserted)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export function handleKnowledgeBaseUpdate(
  db: Db,
  payload: KnowledgeBaseUpdatePayload
): IpcResult<KnowledgeBaseEntry> {
  try {
    const { id, ...fields } = payload

    const existing = db
      .select()
      .from(knowledgeBaseEntries)
      .where(eq(knowledgeBaseEntries.id, id))
      .get()
    if (!existing) return err(`Knowledge base entry ${id} not found`)

    if (fields.category != null && !isValidCategory(fields.category)) {
      return err(
        `Invalid category "${fields.category}". Must be one of: ${KB_CATEGORIES.join(', ')}`
      )
    }

    const updates: Record<string, unknown> = { updatedAt: now() }
    if (fields.title !== undefined) updates.title = fields.title
    if (fields.content !== undefined) updates.content = fields.content
    if (fields.category !== undefined) updates.category = fields.category
    if (fields.setupTypeId !== undefined) updates.setupTypeId = fields.setupTypeId

    const [updated] = db
      .update(knowledgeBaseEntries)
      .set(updates)
      .where(eq(knowledgeBaseEntries.id, id))
      .returning()
      .all()

    if (!updated) return err(`Knowledge base entry ${id} not found`)
    return ok(updated)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export function handleKnowledgeBaseDelete(
  db: Db,
  payload: { id: number }
): IpcResult<void> {
  try {
    const existing = db
      .select()
      .from(knowledgeBaseEntries)
      .where(eq(knowledgeBaseEntries.id, payload.id))
      .get()
    if (!existing) return err(`Knowledge base entry ${payload.id} not found`)

    db.delete(knowledgeBaseEntries).where(eq(knowledgeBaseEntries.id, payload.id)).run()
    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}
