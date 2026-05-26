# Confluent — Architecture

**Scope:** MVP. References to V2/V3 are forward-context only — nothing described here is speculative for MVP.

---

## Full Stack Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Operating System (Windows)            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Electron Application                 │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │               Main Process (Node.js)            │  │  │
│  │  │                                                 │  │  │
│  │  │   ┌─────────────┐   ┌──────────────────────┐   │  │  │
│  │  │   │ better-     │   │   File System        │   │  │  │
│  │  │   │ sqlite3 +   │   │   Manager            │   │  │  │
│  │  │   │ Drizzle ORM │   │   (screenshots,      │   │  │  │
│  │  │   └──────┬──────┘   │    logs, userData)   │   │  │  │
│  │  │          │          └──────────┬───────────┘   │  │  │
│  │  │          └──────────┬──────────┘               │  │  │
│  │  │                     │                          │  │  │
│  │  │            ┌────────┴────────┐                 │  │  │
│  │  │            │  IPC Handlers   │                 │  │  │
│  │  │            │  (ipcMain)      │                 │  │  │
│  │  │            └────────┬────────┘                 │  │  │
│  │  │                     │                          │  │  │
│  │  └─────────────────────┼──────────────────────────┘  │  │
│  │           contextBridge│/ ipcRenderer.invoke()        │  │
│  │  ┌─────────────────────┼──────────────────────────┐  │  │
│  │  │            Preload Script                       │  │  │
│  │  │  (exposes typed window.api surface to renderer) │  │  │
│  │  └─────────────────────┼──────────────────────────┘  │  │
│  │                        │                              │  │
│  │  ┌─────────────────────┼──────────────────────────┐  │  │
│  │  │           Renderer Process (Chromium)           │  │  │
│  │  │                                                 │  │  │
│  │  │  ┌──────────────────────────────────────────┐  │  │  │
│  │  │  │             React Application            │  │  │  │
│  │  │  │                                          │  │  │  │
│  │  │  │  ┌────────┐  ┌────────┐  ┌───────────┐  │  │  │  │
│  │  │  │  │ Trade  │  │  Log   │  │ Calendar  │  │  │  │  │
│  │  │  │  │ Logger │  │ Viewer │  │   View    │  │  │  │  │
│  │  │  │  └────────┘  └────────┘  └───────────┘  │  │  │  │
│  │  │  │  ┌──────────────────┐  ┌─────────────┐  │  │  │  │
│  │  │  │  │ Strategy Rules   │  │  Settings   │  │  │  │  │
│  │  │  │  │     Editor       │  │             │  │  │  │  │
│  │  │  │  └──────────────────┘  └─────────────┘  │  │  │  │
│  │  │  │  ┌──────────────────────────────────┐   │  │  │  │
│  │  │  │  │        Zustand Stores            │   │  │  │  │
│  │  │  │  │  (UI state, no persisted data)   │   │  │  │  │
│  │  │  │  └──────────────────────────────────┘   │  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │  │
│  └───────────────────────────────────────────────────┘  │  │
│                                                          │  │
│  %APPDATA%/confluent/                                    │  │
│  ├── confluent.db                                        │  │
│  ├── screenshots/                                        │  │
│  └── logs/                                               │  │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Process Model

Electron runs two distinct processes. They cannot share memory directly.

### Main Process

Runs in Node.js. This is the backend of the application.

**Owns:**
- SQLite database (via better-sqlite3 + Drizzle ORM)
- File system access — screenshots directory, logs, userData path
- All IPC handlers (`ipcMain.handle`)
- App lifecycle — window creation, startup migrations, error screens

**Why Node.js only:**
- better-sqlite3 is a native C++ Node.js addon. It cannot run in a browser context.
- File system access requires Node.js `fs` APIs, which are unavailable in the renderer.
- Keeping all I/O in one process eliminates concurrency issues with SQLite's single-writer model.

### Renderer Process

Runs in Chromium (a sandboxed browser context). This is the frontend.

**Owns:**
- React component tree
- Zustand stores (UI state only — no persisted data)
- User interaction, form state, routing between views

**Does not own:**
- Database
- File system
- Any Node.js API

The renderer is isolated. It cannot `require('better-sqlite3')`, cannot call `fs.readFile()`, and has no direct path to the database file. All data flows through IPC.

### Preload Script

A thin bridge loaded by Electron before the renderer starts. It runs with Node.js access but exposes a restricted, typed surface to the renderer via `contextBridge.exposeInMainWorld`. This is the only sanctioned crossing point between the two processes.

The preload defines `window.api` — an object of typed async functions that the renderer calls. Each function internally calls `ipcRenderer.invoke()`.

---

## 2. IPC Layer

### Communication Pattern

```
Renderer                  Preload               Main Process
   │                         │                      │
   │  window.api.trade        │                      │
   │  .create(payload)   ────►│  ipcRenderer         │
   │                         │  .invoke(            │
   │                         │    'trade:create',   │
   │                         │    payload)      ────►│  ipcMain.handle(
   │                         │                      │    'trade:create',
   │                         │                      │    handler)
   │                         │                      │
   │                         │                      │  → validate
   │                         │                      │  → write to SQLite
   │                         │                      │  → save screenshot
   │                         │                      │  → return result
   │                         │◄─────────────────────│
   │◄────────────────────────│                      │
   │  { success, trade }     │                      │
```

### Channel Naming Convention

All channels use `domain:action` format:

| Domain | Actions |
|---|---|
| `trade` | `create`, `update`, `delete`, `list`, `get` |
| `setup-type` | `create`, `update`, `delete`, `list` |
| `strategy-rules` | `get`, `upsert` |
| `screenshot` | `save`, `delete` |

### Typed Channels

Every channel has a corresponding TypeScript type shared between main and renderer (placed in a shared types file, e.g., `src/shared/ipc-types.ts`). No `any` crosses the IPC bridge. The preload enforces this by typing `window.api` against those same types.

### Request/Response Contract

- Every IPC call is async — the renderer `await`s the result
- Handlers return a discriminated union: `{ success: true, data: T }` or `{ success: false, error: string }`
- The renderer checks the discriminant before using the result
- Main process handlers never throw to the renderer — they catch internally and return the error shape

---

## 3. Data Layer

### SQLite via better-sqlite3

better-sqlite3 uses a **synchronous API**. This is intentional: SQLite's single-writer model means async wrappers add overhead with no benefit. All DB operations run synchronously in the main process without blocking the renderer (which lives in a separate process).

The database file is a single `.db` file at `%APPDATA%/confluent/confluent.db`. There is no database server, no daemon, no connection pool.

### Drizzle ORM

Drizzle sits between the main process handlers and better-sqlite3. It provides:

- **Schema definition in TypeScript** — `src/main/db/schema.ts` is the single source of truth for the database shape
- **Type-safe query builders** — queries are typed against the schema; shape mismatches are caught at compile time
- **No magic** — Drizzle generates readable SQL; it does not hide what queries run

The schema file defines all tables. No raw `CREATE TABLE` statements exist outside of generated migration files.

### Migration Strategy

Drizzle-kit manages schema migrations.

**Development workflow:**
1. Developer modifies `src/main/db/schema.ts`
2. `npx drizzle-kit generate` produces a new SQL migration file in `drizzle/migrations/`
3. Migration files are committed to the repo

**At app startup (every launch):**
1. Main process calls the migration runner before any IPC handlers register
2. Runner applies all pending migrations in order against the live database
3. If the database file does not exist, it is created fresh and all migrations run
4. If a migration fails, the app surfaces an error screen with the DB path and instructions

This means the database schema is always up to date after startup. No manual migration step is required.

### Table Relationships

```
setup_types ──< trades           (one setup_type → many trades)
setup_types ──── strategy_rules  (one setup_type → exactly one rules record)
```

- Deleting a `setup_type` that has associated `trades` is **blocked** at the application layer (not a DB cascade). The IPC handler checks for references before proceeding.
- `strategy_rules` records are created automatically when a new `setup_type` is saved, with all text fields initialized to empty strings.

---

## 4. File System

### userData Path

Electron exposes `app.getPath('userData')`, which resolves to `%APPDATA%/confluent/` on Windows. All persisted data lives under this path.

```
%APPDATA%/confluent/
├── confluent.db           ← SQLite database (single file, all tables)
├── screenshots/           ← Chart screenshot images (PNG)
│   └── 2026-05-24_42.png
└── logs/                  ← Application error logs
```

The main process creates `screenshots/` and `logs/` on startup if they do not exist.

### Screenshot Storage

Screenshots are stored as PNG files. All source formats (JPEG, BMP, etc.) are normalized to PNG on write.

**Naming convention:** `{YYYY-MM-DD}_{trade_id}.png`

- Date is the trade's local entry date (display only — all DB values remain UTC)
- `trade_id` is the SQLite row ID assigned at insert time
- Example: `2026-05-24_42.png`

**Write sequence:**
1. User pastes or drops an image
2. Trade form holds the raw image bytes in memory (not persisted yet)
3. User submits the form
4. Main process inserts the trade row → receives the assigned `trade_id`
5. Main process writes the image file using the `{date}_{trade_id}.png` name
6. Main process updates `trades.screenshot_path` with the relative filename
7. If the file write fails, the trade row is deleted (rollback) and an error is returned

**At display time:**
- If `screenshot_path` is null, no screenshot UI is rendered
- If `screenshot_path` is set but the file is missing, a "Screenshot not found" placeholder renders — the app does not crash or throw

### Database Path

The DB path is not user-configurable in MVP. It is always `app.getPath('userData') + '/confluent.db'`. The full path is surfaced in error messages so the user can locate it if needed (e.g., for manual backup).

---

## 5. Frontend Structure

### React Application

The renderer is a standard React SPA. electron-vite handles bundling, HMR, and the build pipeline. There is no server-side rendering.

**Navigation model:** A fixed left sidebar with five destinations. Clicking a nav item swaps the main content area. This is client-side routing — no URL bar, no browser history.

### Component Areas

| Area | Responsibility |
|---|---|
| **Trade Logger** | Form for entering a completed trade. All fields required. Supports clipboard paste and drag-and-drop for screenshots. Instrument and session carry over between consecutive entries in a batch. |
| **Log Viewer** | Sortable, filterable table of all trades. Stats panel (win rate, trade count, total P&L) reflects active filters. Clicking a row opens a detail view with full trade data and screenshot. |
| **Calendar View** | Month grid derived from the `trades` table. Each day cell shows trade count, net P&L, and a win/loss color. Clicking a day navigates to that date's trades in Log Viewer. No separate data model — entirely computed from trade records. |
| **Strategy Rules Editor** | Per-setup-type hybrid editor: four structured text fields (entry criteria, HTF confirmation, valid vs. premature entry, session filter) plus a free-text field. One record per setup type, created automatically alongside the setup type. |
| **Settings** | Setup taxonomy management — add, rename, delete setup type labels. Deletion is blocked if any trades reference that setup type. |

### Zustand Stores

Zustand manages **UI state only** — things that don't need to be persisted and don't belong in the database.

**Stores implemented (`src/renderer/src/stores/`):**

| Store | State | Purpose |
|---|---|---|
| `navigation-store.ts` | `activePage: Page` | Tracks the active sidebar page; defaults to `'trade-logger'` |
| `trade-form-store.ts` | `lastInstrument`, `lastSession` | Persists instrument and session across consecutive form submissions for batch entry carry-over |

**Planned (not yet implemented):**
- Log Viewer filter/sort state
- Selected trade in detail view
- Active month in Calendar View

Zustand stores do **not** cache database results. Every view fetches its data via IPC when it mounts or when the user triggers an action. There is no client-side data cache in MVP.

### Shadcn/ui Components

Shadcn/ui components are copied into the project source tree (not imported from a package). They live in `src/renderer/src/components/ui/` and are owned source code — customizable by editing directly. Radix UI primitives handle accessibility and keyboard behavior underneath.

---

## 6. Dependency Boundaries

These are hard rules, not conventions. Violating them breaks the security and architectural model.

| What | Allowed in renderer? | Reason |
|---|---|---|
| `better-sqlite3` | No | Native addon — Node.js only, cannot load in Chromium |
| `drizzle-orm` | No | Must not import DB layer into renderer |
| Node.js `fs`, `path`, `os` | No | Not available in sandboxed renderer context |
| `electron` main-process APIs | No | `ipcMain`, `app`, `BrowserWindow` are main-only |
| `@anthropic-ai/sdk` | No (MVP) | No external calls in MVP; V2+ moves this to main |
| `window.api.*` (preload surface) | Yes | The only sanctioned data channel |
| Zustand stores | Yes | Renderer-side UI state management |
| Shadcn/ui + Tailwind | Yes | UI components, purely presentational |
| Zustand navigation store | Yes | Client-side navigation — `activePage` state replaces a URL router (desktop app, no URL bar needed) |

The renderer is, for all practical purposes, a browser tab. It calls `window.api` methods and renders the results. All side effects happen in the main process.

---

## 7. Startup Sequence

Understanding startup order matters for initialization dependencies.

```
1. Electron launches main process
2. Main process resolves userData path
3. Main process creates screenshots/ and logs/ directories (if missing)
4. Main process opens SQLite connection (creates confluent.db if missing)
5. Main process runs pending migrations via drizzle-kit runner
   └── If migration fails → show error screen, halt
6. Main process registers all ipcMain.handle() channels
7. Main process creates BrowserWindow and loads preload + renderer
8. Renderer initializes React, mounts root component
9. Renderer fetches initial data via window.api calls (setup types, etc.)
10. App is ready for use
```

Steps 3–6 complete before the renderer receives any IPC traffic. There is no race between the database being ready and the renderer making calls.

---

## Forward Compatibility Notes

The MVP architecture is deliberately minimal. These decisions were made with V2/V3 in mind:

- **Strategy rules text fields** are designed to be injected into Claude prompts in V2. The structured fields become consistent prompt tokens; `freeform_notes` captures judgment that structured fields can't.
- **The `setup_type_id` foreign key** on `trades` is the join point for all future AI review — it links every trade to its rules definition.
- **All IPC handlers in the main process** means adding Anthropic API calls in V2 requires no renderer changes — new handlers are registered in main alongside existing ones.
- **No data cache in Zustand** means V2's auto-import review queue can push new trades without cache invalidation complexity.
