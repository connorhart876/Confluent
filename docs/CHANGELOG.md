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

### Fixed

### Removed

---

## [0.1.0] — MVP (In Progress) — 2026-05-24

### Added

### Changed

### Fixed

### Removed
