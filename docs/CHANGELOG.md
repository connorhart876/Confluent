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
