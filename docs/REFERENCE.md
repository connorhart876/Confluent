# Confluent — Feature Reference

One section per major feature. Constraints and edge cases included.

---

## Trade Logger

- Form for logging a single completed trade after the session ends — not designed for real-time entry
- All fields are required: instrument, direction, entry price, exit price, entry time, exit time, session, setup type, outcome, P&L, notes
- Instrument and session carry over from the previous entry within a batch — all other fields reset on submit
- Successful submit writes to SQLite and clears the form; the trade is immediately visible in Log Viewer
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

---

## Trade Log Viewer

- Sortable, filterable table of all logged trades
- Columns: date, instrument, direction, session, setup type, outcome, P&L — with notes truncated in the table row
- Filters: instrument, session, setup type, outcome, date range — combinable, all active simultaneously
- Sort: any column, ascending or descending, one column at a time
- Stats panel shows win rate, total trade count, and total P&L — recalculates to reflect active filters, not the full dataset
- Clicking a trade row opens a detail view with all fields and the screenshot (or placeholder if file is missing)
- No inline editing from the log viewer in MVP — trades are edited by opening the detail view (TBD if edit is in MVP scope)

---

## Calendar View

- Month grid showing which days have trades
- Each day cell displays: trade count, net P&L for the day, win/loss color coding (green = net positive, red = net negative, neutral = breakeven or no trades)
- Derived entirely from the `trades` table — no separate data model or calendar-specific storage
- Clicking a day navigates to Log Viewer filtered to that date
- Days with no trades are shown but empty — no distinction between a trading day with no logged trades and a non-trading day
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

## Settings

- Setup taxonomy management: add, rename, and delete setup type labels
- Deletion is blocked if any trades reference the setup type — see Setup Type Deletion Behavior
- TBD: additional user preferences beyond setup taxonomy (nothing else defined for MVP)

---

## P&L Validation

- P&L is entered manually — no auto-calculation from prices in MVP (contract multipliers and fees vary and would require additional configuration)
- **Sign check:** if direction is Long and exit > entry, P&L must be positive; if exit < entry, P&L must be negative. Inverse for Short. A contradicting sign shows a warning and requires explicit confirmation before saving — it does not block submission (partial fills and fees may legitimately cause contradictions)
- **Zero check:** P&L of exactly $0.00 with outcome set to Win or Loss triggers a suggestion to use Breakeven instead — does not block submission
- Both warnings are advisory — the user can override and save as entered

---

## Setup Type Deletion Behavior

1. User initiates delete from Settings
2. App queries `trades` for any row with a matching `setup_type_id`
3. If zero matches: delete `strategy_rules` record, then delete `setup_type` — immediate, no confirmation required
4. If one or more matches: deletion is blocked; message shown: *"[Setup Name] is referenced by [N] trades and cannot be deleted. Rename it instead, or reassign those trades first."*
5. No cascade delete — referential integrity is enforced at the application layer, not via SQLite `ON DELETE CASCADE`
6. Reassignment requires editing each trade individually in the log viewer — no bulk tool in MVP

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
| `session` | TEXT | "NY AM", "Asian" |
| `setup_type_id` | INTEGER FK | → setup_types.id |
| `outcome` | TEXT | Win, Loss, Breakeven |
| `pnl` | REAL | Signed dollar amount |
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

### Relationships
- `setup_types` → `trades`: one-to-many
- `setup_types` → `strategy_rules`: one-to-one (enforced via unique constraint on `setup_type_id`)
- Calendar view is derived from `trades` only — no additional table

### Constraints
- All timestamps are ISO 8601 strings in UTC
- `screenshot_path` is relative to the screenshots directory; absolute paths are never stored
- Future tables (V2+): `session_notes`, `knowledge_base_entries`, `mistake_profiles`

---

## File System Layout

```
%APPDATA%/confluent/
├── confluent.db           ← Single SQLite file, all tables
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
| P&L sign contradicts price direction | Show warning, require confirmation — does not block submission |
| P&L is $0.00 with Win or Loss outcome | Show Breakeven suggestion — does not block submission |

---

## Development Setup

- **Install:** `npm install` — installs all packages, then automatically rebuilds `better-sqlite3` for Electron via the `postinstall` script
- **If `postinstall` fails** (Python/VS toolchain issues on Windows): run `npm install --ignore-scripts` then `npx @electron/rebuild -f -w better-sqlite3` manually
- **The `better_sqlite3.node` binary** is compiled for Electron's ABI, not the system Node.js ABI — loading it with bare `node` throws `ERR_DLOPEN_FAILED`; this is expected and not a bug
- **After upgrading Electron or better-sqlite3:** run `npm run rebuild` to recompile the native addon for the new ABI version
- **Schema changes:** edit `src/main/db/schema.ts`, run `npm run db:generate` to produce a SQL migration file in `drizzle/migrations/`, commit the migration file alongside the schema change
- **Tailwind dark mode** uses the `class` strategy — the `<html>` element carries `class="dark"` at all times; no light mode toggle exists
