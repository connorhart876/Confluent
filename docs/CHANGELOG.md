# Changelog

All notable changes to Confluent are documented here.

## Format

Each entry follows: `date | what changed | why it matters`

Releases follow [Semantic Versioning](https://semver.org). Categories per release:
- **Added** — new features
- **Changed** — changes to existing behavior
- **Fixed** — bug fixes
- **Removed** — removed features or behavior

---

## [Unreleased]

### Added

- 2026-05-27 | Knowledge base data layer (`src/main/ipc/knowledge-base-handlers.ts`, `src/main/db/schema.ts`, `src/shared/constants.ts`) | New `knowledge_base_entries` table (title, content, nullable category, nullable setup_type_id FK) for storing strategy notes the AI will read alongside strategy rules; `KB_CATEGORIES` fixed enum of 9 allowed values defined in shared constants; 5 IPC handlers (`knowledge-base:list/get/create/update/delete`) — list supports optional category and setupTypeId filters and returns entries most-recently-updated first; create/update validate category against the enum; `setup-type:delete` now nullifies linked entry FKs rather than blocking; `knowledgeBase` namespace added to preload API; migration `0003_daffy_doomsday.sql`; 20 unit tests
- 2026-05-27 | Import review queue data layer (`src/main/ipc/import-handlers.ts`, `src/main/db/schema.ts`) | New `pending_imports` staging table for auto-imported trades awaiting user review; 6 IPC handlers (`import:enqueue/list/get/update/confirm/reject`) — enqueue accepts a batch of parser-produced trades and inserts them with user-assigned fields null; update allows annotating a pending import with session, setup type, notes, and optionally a screenshot (base64 → disk as `pending_{date}_{id}.png`); confirm validates session+setupTypeId are set and atomically inserts the trade into `trades` and deletes the pending row in a single transaction; reject deletes the pending row and cleans up the screenshot file; `import` namespace added to preload API; migration `0002_chilly_freak.sql`; 22 unit tests
- 2026-05-26 | Tradovate CSV parser module (`src/main/import/tradovate-parser.ts`) | Standalone main-process parser that takes a Tradovate Orders CSV export string, filters to Filled orders, maps instrument symbols via the `Product` column, pairs entry/exit fills FIFO per instrument with partial quantity matching, computes gross P&L from CME tick values, and returns an array of normalized `ParsedTrade` objects plus per-row errors; handles edge cases including empty CSV, headers-only, canceled orders, unsupported instruments, and malformed data
- 2026-05-26 | `quantity` column added to `trades` table (migration `drizzle/migrations/0001_jazzy_northstar.sql`) | Tracks number of contracts per trade; existing trades default to 1; displayed as "Contracts" in the trade form and "Qty" in the log viewer table
- 2026-05-26 | Auto-computed P&L and outcome (`src/shared/constants.ts`, `src/main/ipc/index.ts`) | P&L is now computed server-side from entry/exit prices, direction, instrument, and quantity using known CME dollar-per-point values (ES: $50, NQ: $20, MES: $5, MNQ: $2); outcome is derived from P&L sign (positive=Win, negative=Loss, zero=Breakeven); both fields removed from the trade entry form; `trade:create` and `trade:update` IPC handlers compute these before writing to SQLite
- 2026-05-26 | Shared constants module (`src/shared/constants.ts`) | Extracts instrument, direction, session, and outcome arrays from renderer to `src/shared/` so both main and renderer can import them; adds `Instrument`, `Direction`, `Outcome` types, `DOLLAR_PER_POINT` map, `computePnl()`, and `deriveOutcome()` utilities
- 2026-05-26 | Vitest test infrastructure (`package.json`, `src/main/import/__tests__/tradovate-parser.test.ts`) | First test runner in the project; 19 unit tests covering the Tradovate parser: happy path, empty/headers-only CSV, missing columns, unsupported instruments, partial quantity matching, multi-contract trades, P&L accuracy for all four instrument types, and the real Tradovate CSV sample
- 2026-05-26 | New dependencies: `papaparse` ^5.5.3 (CSV parsing), `@types/papaparse` ^5.5.2, `vitest` ^4.1.7 (test runner) | Parser uses PapaParse for robust CSV handling (quoted fields, BOM, varied line endings); vitest integrates natively with the Vite-based build
- 2026-05-26 | Corrupted database error dialog (`src/main/index.ts`) | `initDb()` is now wrapped in a try/catch; if the database cannot be opened or migrations fail, Electron's native `dialog.showErrorBox()` displays the full DB file path and step-by-step recovery instructions (delete `confluent.db`, restart), then quits cleanly — prevents silent crash on a corrupted database
- 2026-05-26 | Calendar View — `CalendarPage`, `CalendarGrid` (`src/renderer/src/pages/calendar-page.tsx`, `src/renderer/src/components/calendar/calendar-grid.tsx`) | Month grid showing trades by date: each day cell displays trade count, net P&L (color-coded green/red/neutral), and a primary-color ring on today's date; adjacent-month days shown greyed out and inert; only days with trades are clickable; clicking a day resets Log Viewer filters and navigates to that date's trades; month navigation via prev/next chevrons with a "Today" button when viewing a past or future month; month-scoped data fetch (only displayed month's trades loaded via `trade:list` IPC); active month is local React state and resets to current month on re-navigation
- 2026-05-26 | Trade Log Viewer — `LogViewerPage`, `TradesTable`, `TradeFilters`, `StatsPanel`, `TradeDetailDialog` (`src/renderer/src/pages/log-viewer-page.tsx`, `src/renderer/src/components/log-viewer/`) | Sortable, filterable table of all logged trades with a stats panel (win rate, total trades, total P&L) that recalculates to reflect active filters; columns: date, instrument, direction, session, setup type, outcome badge, P&L (color-coded), notes (truncated); client-side column sort via Zustand; server-side filters (instrument, session, setup type, outcome, date range) passed to `trade:list` IPC; clicking a row opens a detail modal with all fields and chart screenshot; missing screenshot shows placeholder
- 2026-05-26 | `LogViewerStore` (`src/renderer/src/stores/log-viewer-store.ts`) | Zustand store managing filter state, sort column/direction, and selected trade ID for the Log Viewer; filter state persists across in-session navigations
- 2026-05-26 | `screenshot:load` IPC handler (`src/main/ipc/index.ts`) | New channel reads a screenshot file by filename and returns a base64 data URL, or `null` if the file is missing (not an error); enables the renderer to display chart screenshots in the trade detail modal
- 2026-05-26 | Shadcn/ui primitives: `Table`, `Badge`, `Popover`, `Calendar` (`src/renderer/src/components/ui/`) | Table and Badge for the trades table; Popover and Calendar (wrapping react-day-picker v10) for the date range filter; Badge variant system includes Win/Loss/Breakeven semantic variants
- 2026-05-26 | New dependencies: `react-day-picker` ^10.0.1, `@radix-ui/react-popover` | Calendar component for date range filter in Log Viewer
- 2026-05-25 | `StrategyRulesPage` and `RulesEditor` (`src/renderer/src/pages/strategy-rules-page.tsx`, `src/renderer/src/components/strategy-rules/rules-editor.tsx`) | Two-panel Strategy Rules Editor: setup type list on the left auto-selects the first item on load; right panel shows 5 plain-text fields (Entry Criteria, HTF Confirmation, Valid vs. Premature Entry, Session Filter, Notes) with an explicit Save Rules button; switching setup types with unsaved edits triggers an inline amber banner with Save and Discard actions before the switch is allowed; `App.tsx` wired to replace the placeholder with `StrategyRulesPage`
- 2026-05-25 | Initial Drizzle migration generated (`drizzle/migrations/0000_lethal_magdalene.sql`) — creates `setup_types`, `strategy_rules`, and `trades` tables; establishes FK relationships and unique constraints | Schema is now version-controlled; future schema changes will generate incremental migration files
- 2026-05-25 | `src/main/db/index.ts` — DB layer for main process | Opens SQLite at `app.getPath('userData')/confluent.db`, enables WAL mode and FK enforcement, runs pending migrations at startup, creates `screenshots/` and `logs/` directories if missing; exports `db` instance and `screenshotsPath` for use by IPC handlers
- 2026-05-25 | `src/main/ipc/index.ts` — registers all IPC handlers | Wires every channel defined in `src/shared/ipc-types.ts`: `trade:create/list/get/update/delete`, `setup-type:list/create/update/delete`, `strategy-rules:get/upsert`; `setup-type:create` auto-creates a paired `strategy_rules` row; `setup-type:delete` enforces the trade-reference block at the application layer; `trade:create` handles screenshot write and rollback on file write failure
- 2026-05-25 | `src/main/index.ts` updated to call `initDb()` then `registerHandlers()` before `createWindow()` | Ensures DB migrations complete and all IPC channels are live before the renderer can make any calls
- 2026-05-25 | App shell — `Layout`, `Sidebar`, `NavigationStore` (`src/renderer/src/components/layout/`, `src/renderer/src/stores/navigation-store.ts`) | Fixed sidebar with 5 nav items; Zustand page state replaces a URL router; Trade Logger is the default page on launch
- 2026-05-25 | Shadcn/ui component library — `Button`, `Input`, `Textarea`, `Label`, `Select`, `ToggleGroup`, `Dialog`, `Toast`/`Toaster`/`useToast`, `Form` wrapper (`src/renderer/src/components/ui/`) | Base UI primitives for all current and future pages; copied source pattern — no npm package dependency
- 2026-05-25 | Trade Logger form — `TradeEntryForm`, `TradeLoggerPage` (`src/renderer/src/components/trade-form/`, `src/renderer/src/pages/`) | All 11 fields wired to react-hook-form + zod; submit saves via `trade:create` IPC, shows success toast, clears form
- 2026-05-25 | P&L validation — `PnlWarningDialog`, `pnl-validation.ts` | Sign-mismatch check opens a confirmation dialog (non-blocking override); zero-check with Win/Loss outcome shows an inline Breakeven suggestion with one-click correction
- 2026-05-25 | Screenshot handling — `ScreenshotAttach` component | Clipboard paste (Ctrl+V) and drag-and-drop both capture the image as base64 in renderer state; base64 is included in the `trade:create` payload so the main process writes the file and updates `screenshot_path` atomically
- 2026-05-25 | Batch entry carry-over — `TradeFormStore` (`src/renderer/src/stores/trade-form-store.ts`) | Instrument and session are stored in Zustand on each successful submit and pre-filled when the form resets, matching the post-session batch entry workflow
- 2026-05-25 | `src/shared/ipc-types.ts` updated to re-export `Trade`, `SetupType`, `StrategyRules` | Renderer can import DB types via `@shared/ipc-types` without crossing into the main process source tree
- 2026-05-25 | `tsconfig.web.json` updated to include `src/main/db/schema.ts` | Resolves the import chain for `ipc-types.ts` without duplicating type definitions; schema file is type-only in the renderer context
- 2026-05-25 | New dependencies: `@hookform/resolvers`, `class-variance-authority`, `tailwindcss-animate`, `lucide-react`, `@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-select`, `@radix-ui/react-toggle-group`, `@radix-ui/react-dialog`, `@radix-ui/react-toast` | UI primitive and utility packages required by the Shadcn component library and Trade Logger form
- 2026-05-25 | `SettingsPage` and `SetupTypeList` (`src/renderer/src/pages/settings-page.tsx`, `src/renderer/src/components/settings/setup-type-list.tsx`) | Settings page with full setup type CRUD: add (text input + Add button), inline rename (pencil icon → input, Enter/Escape), delete (immediate for unreferenced types; error toast with blocking message for referenced types); 50-character name limit enforced client-side; empty-state message when no types exist

### Changed

- 2026-05-26 | Trade entry form — P&L and outcome fields removed, Contracts field added (`src/renderer/src/components/trade-form/trade-entry-form.tsx`, `src/renderer/src/lib/trade-form-schema.ts`) | P&L and outcome are now auto-computed server-side; Contracts field (integer, default 1) added in their place; row layout adjusted from 3-column (entry price, exit price, P&L) to 3-column (entry price, exit price, contracts) and entry/exit time row changed from 3-column to 2-column
- 2026-05-26 | Log viewer table — Qty column added between Setup Type and Outcome (`src/renderer/src/components/log-viewer/trades-table.tsx`, `src/renderer/src/stores/log-viewer-store.ts`, `src/renderer/src/pages/log-viewer-page.tsx`) | Quantity is sortable; trade detail dialog also shows Contracts
- 2026-05-26 | `TradeCreatePayload` no longer includes `pnl` or `outcome` (`src/shared/ipc-types.ts`) | These fields are computed by the IPC handler, not sent by the renderer
- 2026-05-26 | `trade-form-schema.ts` imports enums from `@shared/constants` instead of defining them inline | Enables the parser and other main-process code to use the same enum arrays without importing from renderer

### Fixed

### Removed

- 2026-05-26 | `pnl-validation.ts` and `PnlWarningDialog` deleted | No longer needed — P&L is auto-computed, so sign-mismatch and zero-check validations are obsolete

---

## [0.1.0] — MVP (In Progress) — 2026-05-24

### Added

### Changed

### Fixed

### Removed
