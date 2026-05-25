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

- 2026-05-25 | Initial Drizzle migration generated (`drizzle/migrations/0000_lethal_magdalene.sql`) — creates `setup_types`, `strategy_rules`, and `trades` tables; establishes FK relationships and unique constraints | Schema is now version-controlled; future schema changes will generate incremental migration files
- 2026-05-25 | `src/main/db/index.ts` — DB layer for main process | Opens SQLite at `app.getPath('userData')/confluent.db`, enables WAL mode and FK enforcement, runs pending migrations at startup, creates `screenshots/` and `logs/` directories if missing; exports `db` instance and `screenshotsPath` for use by IPC handlers
- 2026-05-25 | `src/main/ipc/index.ts` — registers all IPC handlers | Wires every channel defined in `src/shared/ipc-types.ts`: `trade:create/list/get/update/delete`, `setup-type:list/create/update/delete`, `strategy-rules:get/upsert`; `setup-type:create` auto-creates a paired `strategy_rules` row; `setup-type:delete` enforces the trade-reference block at the application layer; `trade:create` handles screenshot write and rollback on file write failure
- 2026-05-25 | `src/main/index.ts` updated to call `initDb()` then `registerHandlers()` before `createWindow()` | Ensures DB migrations complete and all IPC channels are live before the renderer can make any calls

### Changed

### Fixed

### Removed

---

## [0.1.0] — MVP (In Progress) — 2026-05-24

### Added

### Changed

### Fixed

### Removed
