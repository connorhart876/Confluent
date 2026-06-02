# Confluent — Feature Reference

One section per major feature. Constraints and edge cases included.

---

## Trade Logger

- Form for logging a single completed trade after the session ends — not designed for real-time entry
- All fields are required: instrument, direction, entry price, exit price, entry time, exit time, session, setup type, contracts (quantity), notes
- P&L and outcome are not entered manually — they are auto-computed server-side when the trade is saved (P&L from prices/direction/instrument/quantity using CME tick values; outcome derived from P&L sign)
- Two submit actions, both fully validate before saving:
  - **Save** — saves the trade and navigates to Dashboard
  - **Log another** — saves the trade, stays on the form, and carries over instrument and session for the next entry
- Instrument and session carry over on "Log another" — all other fields reset (quantity resets to 1)
- Successful submit writes to SQLite; the trade is immediately visible once the user returns to a trade list view
- Form state is not persisted — closing the app or navigating away mid-entry loses unsaved data (no autosave in MVP)
- SQLite write failure returns an error toast; the form is not cleared and the user can retry
- Screenshot attach is optional — a trade can be saved without one

---

## Setup Taxonomy

- User-defined labels for setup types (e.g., "FVG Sweep", "OB Rejection") — nothing is hardcoded
- Managed in Settings; labels populate the setup type dropdown in the Trade Logger
- Adding a new setup type automatically creates a corresponding `strategy_rules` record with empty fields
- Renaming a setup type updates the `setup_types` row; all associated trades and rules follow via FK
- Deleting a setup type that has no associated trades succeeds immediately
- Deleting a setup type referenced by one or more trades is blocked — app displays a message naming the setup and trade count, and suggests renaming instead
- No bulk reassignment tool in MVP — trades must be edited individually to change their setup type before deletion is possible

---

## Strategy Rules Editor

- One rules record per setup type, created automatically when the setup type is created
- Four structured fields: entry criteria, HTF confirmation requirements, valid confirmation vs. premature entry conditions, session filters
- One free-text field per setup for nuance, judgment calls, and hard no-trade exceptions that structured fields cannot capture
- All fields are plain text — no formatting, no rich text in MVP
- Rules persist to SQLite immediately on save and survive app restart
- These fields are the AI prompt foundation for V2 post-trade review — structured fields provide consistent parseable signal; free-text captures what they cannot
- A setup type with empty rules fields is valid — the editor does not require rules to be filled in
- Layout: two-panel — setup type list on the left, 5-field form on the right; first setup type is auto-selected on load
- Switching setup types while the form has unsaved edits shows an inline amber banner ("Unsaved changes") with Save and Discard actions — the switch does not proceed until one is chosen
- If no setup types have been created, the page shows an empty state with a link to Settings

---

## Trade Log Viewer

- Sortable, filterable table of all logged trades
- Columns: date, instrument, direction, session, setup type, qty, outcome (displayed as a badge), P&L (color-coded: green for positive, red for negative) — with notes truncated in the table row
- Filters: instrument, session, setup type, outcome, date range — combinable, all active simultaneously; date range uses a calendar picker popover; filter state persists during the session (navigating away and back retains active filters)
- Sort: any column, ascending or descending, one column at a time; sort is client-side (no additional IPC call); default is entry time descending (newest first)
- Stats panel shows win rate, total trade count, and total P&L — recalculates to reflect active filters, not the full dataset; win rate shows "--" when no trades match
- Clicking a trade row opens a detail modal with all fields and the screenshot (or a "Screenshot not found" placeholder if the file is missing)
- No inline editing from the log viewer in MVP — trades are edited by opening the detail view (TBD if edit is in MVP scope)

---

## Calendar View

- Month grid showing which days have trades
- Each day cell displays: trade count, net P&L for the day, win/loss color coding (green = net positive, red = net negative, neutral = breakeven or no trades)
- Derived entirely from the `trades` table — no separate data model or calendar-specific storage
- Only days with trades are clickable — clicking a day with trades navigates to the Log Viewer with date filters pre-set to that day; days with no trades are inert
- Days with no trades are shown but empty — no distinction between a trading day with no logged trades and a non-trading day
- Adjacent-month days (leading/trailing grid cells) are shown greyed out and are never clickable
- Today's date has a subtle primary-color ring indicator to orient the user
- Month navigation: previous/next chevron buttons; a "Today" button appears when viewing any month other than the current one
- Data is fetched for the displayed month only (not all trades) — re-fetches when the month changes
- Active month is local React state in `CalendarPage` — navigating away and back resets to the current month
- No week or day view in MVP — month grid only

---

## Chart Screenshot Attach

- Two attach methods: paste from clipboard (Ctrl+V) and drag-and-drop onto the trade entry form
- Screenshot is held in memory until the trade form is submitted — it is not written to disk prematurely
- On submit, the trade row is inserted first to obtain the `trade_id`; the file is then written as `{YYYY-MM-DD}_{trade_id}.png`
- If the file write fails after the trade row is inserted, the trade row is deleted and an error is returned — no orphaned records
- All source formats are normalized to PNG on write
- `screenshot_path` in the database is relative to the screenshots directory — not an absolute path
- If a screenshot file is missing at display time (moved or deleted externally), the detail view renders a "Screenshot not found" placeholder — the app does not crash or surface an error
- No in-app annotation in MVP — screenshots are store-and-display only

---

## Import Review Queue (V2)

- Auto-imported trades from the CSV parser never go directly into the `trades` table — they enter a `pending_imports` staging table first
- The user must assign session, setup type (and optionally notes and a screenshot) before confirming a trade to the main log
- **Enqueue (`import:enqueue`):** accepts an array of `ParsedTrade`-shaped objects; all user-assigned fields (`session`, `setupTypeId`, `notes`, `screenshotPath`) are initialized to null; rejects empty arrays
- **List (`import:list`):** returns all rows in `pending_imports` — no filters in current implementation
- **Get (`import:get`):** returns a single pending import by ID
- **Update (`import:update`):** only user-assigned fields can be changed (`session`, `setupTypeId`, `notes`, `screenshotPath`); CSV-sourced fields are immutable; if `screenshotData` (base64 string) is provided, the file is written to the screenshots directory as `pending_{YYYY-MM-DD}_{id}.png` and the path is stored
- **Confirm (`import:confirm`):** validates that both `session` and `setupTypeId` are non-null before proceeding; atomically inserts the trade into `trades` and deletes the pending row in a single transaction; trusts the parser-computed `pnl` and `outcome` without re-computing; `notes` null is coerced to `''` (trades.notes is NOT NULL)
- **Reject (`import:reject`):** deletes the pending row; if a screenshot was attached, the file is deleted from disk (missing file is not fatal)
- Pending screenshots use the naming convention `pending_{YYYY-MM-DD}_{pending_id}.png` to distinguish them from confirmed-trade screenshots
- No duplicate detection — re-importing the same CSV produces additional pending rows

---

## Knowledge Base (V2)

- Stores strategy notes the AI reads alongside strategy rules when reviewing trades
- Five CRUD operations: `knowledge-base:list`, `knowledge-base:get`, `knowledge-base:create`, `knowledge-base:update`, `knowledge-base:delete`
- **Schema:** each entry has a required `title` (TEXT), required `content` (TEXT), optional `category` (TEXT, must be one of the 9 allowed values), and optional `setup_type_id` FK (nullable — entries can be global or linked to a specific setup type)
- **Allowed categories** (defined as `KB_CATEGORIES` in `src/shared/constants.ts`):
  - HTF Bias & Draw on Liquidity
  - Session Context
  - The Three Models
  - Entry Criteria & IFVG Rules
  - Hard No-Trade Rules
  - Stop Loss & Invalidation Logic
  - Take Profit & Trade Management
  - Session Management & Re-Entry Rules
  - Known Mistakes & Patterns
- **List** returns all entries ordered by `updatedAt` descending (most recently edited first); optionally filtered by `category` or `setupTypeId` (both filters can be applied simultaneously)
- **Create** validates category against the allowed enum if provided; null category is allowed
- **Update** is a partial update — only fields included in the payload are changed; `undefined` = do not change; `null` = clear the field (for nullable fields); category is validated if provided and non-null
- **Delete** checks existence and returns `err()` if not found
- When a setup type is deleted, all linked knowledge base entry FKs are nullified (entries preserved, `setup_type_id` set to null) — not cascaded or blocked

---

## Tradovate CSV Import (V2)

- Standalone parser module at `src/main/import/tradovate-parser.ts` — no database or IPC dependencies
- Parses Tradovate's **Orders tab CSV export** format
- Main export: `parseTradovateCsv(csv: string): ParseResult` — takes raw CSV string, returns structured trades + errors
- **Status filtering:** only rows with `Status = Filled` are processed; canceled, rejected, and other statuses are silently skipped
- **Instrument mapping:** uses the `Product` column directly (values: ES, NQ, MES, MNQ); falls back to parsing the `Contract` column (e.g., `MNQM6` → MNQ) if Product is missing; unsupported instruments produce a per-row error
- **Column aliasing:** normalizes CSV headers to handle Tradovate format variations (e.g., `B/S` or `Buy/Sell` → action; `avgPrice` or `Avg Fill Price` → price)
- **Fill pairing:** FIFO per instrument, sorted by timestamp; Buy then Sell = Long trade; Sell then Buy = Short trade; partial quantity matching splits fills when sizes differ (Buy 3 + Sell 1 = one trade of qty 1, Buy 2 remains in queue)
- **P&L computation:** uses `computePnl()` from shared constants — same tick values as the trade form
- **Timestamp parsing:** expects `MM/DD/YYYY HH:MM:SS` format from Tradovate; interpreted as local time (system timezone), converted to ISO 8601 UTC
- **Error model:** file-level errors (empty CSV, missing required columns) throw; row-level errors (bad instrument, malformed price/date) are collected in `errors[]` array without stopping other rows; unpaired fills (open positions) reported in `summary.unpaired`
- **Output type:** `ParsedTrade` includes instrument, direction, entryPrice, exitPrice, entryTime, exitTime, quantity, pnl, outcome — but NOT session, setupTypeId, or notes (user-assigned in the review queue)
- Parser output is consumed by `import:enqueue`, which inserts the trades into `pending_imports` for user annotation before they are confirmed to the main `trades` table
- No UI for file selection yet — parser and review queue IPC layer are complete; UI integration is pending

---

## Settings

- Setup taxonomy management: add, rename, and delete setup type labels
- Deletion is blocked if any trades reference the setup type — see Setup Type Deletion Behavior
- Anthropic API key management — see API Key Storage section below

---

## API Key Storage

- The Anthropic API key is stored encrypted at rest using Electron's `safeStorage` API, which delegates to Windows DPAPI on Windows
- The encrypted blob is written to `%APPDATA%/confluent/api-key.enc` — a binary file, not human-readable; it is never stored in SQLite or `.env`
- **Save (`api-key:save`):** accepts the raw key string from the renderer; trims whitespace; rejects empty/whitespace-only input; checks `safeStorage.isEncryptionAvailable()` before encrypting; writes to `api-key.enc.tmp` then atomically renames to `api-key.enc` (guards against mid-write corruption)
- **Clear (`api-key:clear`):** deletes `api-key.enc`; idempotent — succeeds even if no key file is present
- **Exists (`api-key:exists`):** returns `{ exists: boolean, encryptionAvailable: boolean }` — checks for the file without decrypting; used by the Settings page to display status on mount
- **Load** is not an IPC channel — `loadApiKey()` is a plain TypeScript function in `src/main/security/api-key-store.ts` exported for consumption by main-process Anthropic SDK handlers only; the decrypted key never crosses the IPC bridge to the renderer
- `safeStorage.isEncryptionAvailable()` is called at handler invocation time (after `app.ready`) — not at module load
- DPAPI encryption is scoped to the Windows user account; copying `api-key.enc` to another user or machine produces a decryption error (treated as null — the key is gone)
- Settings UI shows a tri-state status badge: "No key stored" / "Key stored" / "Encryption unavailable on this system"; the Save button is disabled when encryption is unavailable
- A soft prefix check warns (non-blocking toast) if the entered key does not start with `sk-ant-` — the save proceeds regardless; no validation against the live Anthropic API

---

## P&L Computation

- P&L is auto-computed from entry price, exit price, direction, instrument, and quantity — not manually entered
- Uses fixed CME dollar-per-point values: ES = $50/pt, NQ = $20/pt, MES = $5/pt, MNQ = $2/pt
- Formula: `(exitPrice - entryPrice) × dollarPerPoint × quantity` for Long; negated for Short
- Outcome is auto-derived from the computed P&L: positive = Win, negative = Loss, zero = Breakeven
- Computation happens in the main process IPC handler (`trade:create`, `trade:update`) — the renderer never sends P&L or outcome
- This is gross P&L only — no commissions, fees, or exchange costs are deducted
- The `computePnl()` and `deriveOutcome()` utilities live in `src/shared/constants.ts` and are also used by the Tradovate CSV parser

---

## Setup Type Deletion Behavior

1. User initiates delete from Settings
2. App queries `trades` for any row with a matching `setup_type_id`
3. If one or more matches: deletion is blocked; message shown: *"[Setup Name] is referenced by [N] trades and cannot be deleted. Rename it instead, or reassign those trades first."*
4. If zero trade matches: proceed with cleanup —
   a. Nullify `knowledge_base_entries.setup_type_id` for any linked entries (entries are preserved, FK set to null)
   b. Delete the paired `strategy_rules` record
   c. Delete the `setup_type` row
5. No cascade delete — all FK lifecycle logic is enforced at the application layer, not via SQLite `ON DELETE CASCADE`
6. Reassignment of trades requires editing each trade individually in the log viewer — no bulk tool in MVP

---

## Data Model

### `trades`
| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-assigned by SQLite |
| `instrument` | TEXT | ES, NQ, MES, MNQ |
| `direction` | TEXT | Long, Short |
| `entry_price` | REAL | |
| `exit_price` | REAL | |
| `entry_time` | TEXT | ISO 8601 UTC |
| `exit_time` | TEXT | ISO 8601 UTC |
| `quantity` | INTEGER | Number of contracts (default 1) |
| `session` | TEXT | "NY AM", "Asian" |
| `setup_type_id` | INTEGER FK | → setup_types.id |
| `outcome` | TEXT | Win, Loss, Breakeven — auto-derived from P&L sign |
| `pnl` | REAL | Signed dollar amount — auto-computed from prices/direction/instrument/quantity |
| `notes` | TEXT | |
| `screenshot_path` | TEXT | Relative path, nullable |
| `created_at` | TEXT | ISO 8601 UTC |
| `updated_at` | TEXT | ISO 8601 UTC |

### `setup_types`
| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `name` | TEXT | Unique, user-defined |
| `created_at` | TEXT | ISO 8601 UTC |
| `updated_at` | TEXT | ISO 8601 UTC |

### `strategy_rules`
| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `setup_type_id` | INTEGER FK | → setup_types.id, unique (one-to-one) |
| `entry_criteria` | TEXT | |
| `htf_confirmation` | TEXT | |
| `valid_vs_premature` | TEXT | |
| `session_filter` | TEXT | |
| `freeform_notes` | TEXT | |
| `created_at` | TEXT | ISO 8601 UTC |
| `updated_at` | TEXT | ISO 8601 UTC |

### `pending_imports`
| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-assigned |
| `instrument` | TEXT | From CSV parser — ES, NQ, MES, MNQ |
| `direction` | TEXT | From CSV parser — Long, Short |
| `entry_price` | REAL | From CSV parser |
| `exit_price` | REAL | From CSV parser |
| `entry_time` | TEXT | ISO 8601 UTC — from CSV parser |
| `exit_time` | TEXT | ISO 8601 UTC — from CSV parser |
| `quantity` | INTEGER | From CSV parser |
| `pnl` | REAL | From CSV parser — not re-computed at confirm |
| `outcome` | TEXT | From CSV parser — Win, Loss, Breakeven |
| `session` | TEXT | Nullable — assigned by user during review |
| `setup_type_id` | INTEGER FK | Nullable → setup_types.id — assigned by user |
| `notes` | TEXT | Nullable — assigned by user |
| `screenshot_path` | TEXT | Nullable — attached during review |
| `created_at` | TEXT | ISO 8601 UTC |
| `updated_at` | TEXT | ISO 8601 UTC |

### `knowledge_base_entries`
| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-assigned |
| `title` | TEXT | Required |
| `content` | TEXT | Required — the strategy note body |
| `category` | TEXT | Nullable — must be one of the 9 `KB_CATEGORIES` values if set |
| `setup_type_id` | INTEGER FK | Nullable → setup_types.id — for setup-specific entries |
| `created_at` | TEXT | ISO 8601 UTC |
| `updated_at` | TEXT | ISO 8601 UTC |

### Relationships
- `setup_types` → `trades`: one-to-many
- `setup_types` → `strategy_rules`: one-to-one (enforced via unique constraint on `setup_type_id`)
- `setup_types` → `pending_imports`: one-to-many (nullable FK)
- `setup_types` → `knowledge_base_entries`: one-to-many (nullable FK)
- Calendar view is derived from `trades` only — no additional table

### Constraints
- All timestamps are ISO 8601 strings in UTC
- `screenshot_path` is relative to the screenshots directory; absolute paths are never stored
- Future tables (V3+): `mistake_profiles`

---

## File System Layout

```
%APPDATA%/confluent/
├── confluent.db           ← Single SQLite file, all tables
├── api-key.enc            ← Anthropic API key encrypted via DPAPI (binary); absent until user saves a key
├── screenshots/           ← PNG files, created on startup if missing
│   └── {YYYY-MM-DD}_{trade_id}.png
└── logs/                  ← App error logs, created on startup if missing
```

- All paths are resolved via `app.getPath('userData')` — not hardcoded
- `screenshots/` and `logs/` are created automatically at startup if they do not exist
- The database file is created automatically at startup if it does not exist (fresh database, all migrations applied)
- No user-configurable path for any of these locations in MVP

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Screenshot file missing at display time | Render "Screenshot not found" placeholder — no error thrown, no crash |
| SQLite write failure on trade submit | Show error toast, keep form populated, allow retry |
| Screenshot file write fails after trade insert | Delete the trade row (rollback), return error to renderer — no orphaned records |
| Form closed or navigated away mid-entry | Unsaved data is lost — no autosave, no recovery |
| Database file missing at startup | Create a new empty database and apply all migrations — fresh start |
| Database file corrupted at startup | Show an error screen with the full DB file path and instructions to delete and restart |
| `screenshots/` directory missing at startup | Create it automatically — not an error condition |
| Setup type deletion blocked by trade references | Show blocking message with setup name and trade count — no deletion occurs |
| Tradovate CSV with missing required columns | Parser throws with descriptive message listing missing columns |
| Tradovate CSV row with unsupported instrument | Row added to errors array with reason; other rows still processed |
| `import:enqueue` with empty array | Handler returns `err('No trades to enqueue')` without touching the DB |
| `import:confirm` with null session or setupTypeId | Handler returns `err()` naming the missing fields; no insert attempted |
| `import:reject` with screenshot — file missing on disk | File deletion silently skipped; pending row still deleted — not an error |
| `knowledge-base:create` / `:update` with invalid category | Handler returns `err()` listing the 9 allowed values; no write attempted |
| `api-key:save` with empty or whitespace-only key | Handler returns `err('API key cannot be empty')`; no file written |
| `api-key:save` when `safeStorage.isEncryptionAvailable()` is false | Handler returns `err('Encryption is not available on this system')`; Save button disabled in UI |
| `api-key:clear` when no key file exists | Silently succeeds — idempotent |
| `loadApiKey()` when `api-key.enc` exists but decryption fails (e.g. DPAPI profile mismatch) | Returns `null`; caller treats it as no key present |

---

## Development Setup

- **Install:** `npm install` — installs all packages, then automatically rebuilds `better-sqlite3` for Electron via the `postinstall` script
- **If `postinstall` fails** (Python/VS toolchain issues on Windows): run `npm install --ignore-scripts` then `npx @electron/rebuild -f -w better-sqlite3` manually
- **The `better_sqlite3.node` binary** is compiled for Electron's ABI, not the system Node.js ABI — loading it with bare `node` throws `ERR_DLOPEN_FAILED`; this is expected and not a bug
- **After upgrading Electron or better-sqlite3:** run `npm run rebuild` to recompile the native addon for the new ABI version
- **Schema changes:** edit `src/main/db/schema.ts`, run `npm run db:generate` to produce a SQL migration file in `drizzle/migrations/`, commit the migration file alongside the schema change
- **Tailwind dark mode** uses the `class` strategy — the `<html>` element carries `class="dark"` at all times; no light mode toggle exists
