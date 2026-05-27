import { sqliteTable, integer, real, text } from 'drizzle-orm/sqlite-core'

export const setupTypes = sqliteTable('setup_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const trades = sqliteTable('trades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  instrument: text('instrument').notNull(),
  direction: text('direction').notNull(),
  entryPrice: real('entry_price').notNull(),
  exitPrice: real('exit_price').notNull(),
  entryTime: text('entry_time').notNull(),
  exitTime: text('exit_time').notNull(),
  session: text('session').notNull(),
  quantity: integer('quantity').notNull().default(1),
  setupTypeId: integer('setup_type_id')
    .notNull()
    .references(() => setupTypes.id),
  outcome: text('outcome').notNull(),
  pnl: real('pnl').notNull(),
  notes: text('notes').notNull(),
  screenshotPath: text('screenshot_path'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const strategyRules = sqliteTable('strategy_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  setupTypeId: integer('setup_type_id')
    .notNull()
    .unique()
    .references(() => setupTypes.id),
  entryCriteria: text('entry_criteria').notNull().default(''),
  htfConfirmation: text('htf_confirmation').notNull().default(''),
  validVsPremature: text('valid_vs_premature').notNull().default(''),
  sessionFilter: text('session_filter').notNull().default(''),
  freeformNotes: text('freeform_notes').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const pendingImports = sqliteTable('pending_imports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  instrument: text('instrument').notNull(),
  direction: text('direction').notNull(),
  entryPrice: real('entry_price').notNull(),
  exitPrice: real('exit_price').notNull(),
  entryTime: text('entry_time').notNull(),
  exitTime: text('exit_time').notNull(),
  quantity: integer('quantity').notNull(),
  pnl: real('pnl').notNull(),
  outcome: text('outcome').notNull(),
  session: text('session'),
  setupTypeId: integer('setup_type_id').references(() => setupTypes.id),
  notes: text('notes'),
  screenshotPath: text('screenshot_path'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export type Trade = typeof trades.$inferSelect
export type NewTrade = typeof trades.$inferInsert
export type SetupType = typeof setupTypes.$inferSelect
export type NewSetupType = typeof setupTypes.$inferInsert
export type StrategyRules = typeof strategyRules.$inferSelect
export type NewStrategyRules = typeof strategyRules.$inferInsert
export type PendingImport = typeof pendingImports.$inferSelect
export type NewPendingImport = typeof pendingImports.$inferInsert
