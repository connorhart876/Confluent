# Project Status

_Update this file as work completes. Check off items as they pass manual verification._

---

## Current Milestone: MVP

A fully offline manual trade journal with user-defined strategy rules — no AI, no broker integration, no external dependencies.

**Status:** Complete

---

## MVP Checklist

### Trade Logger
- [x] Can open the app and see the trade entry form
- [x] All required fields are present: instrument, direction, entry price, exit price, entry time, exit time, session, setup type, quantity, notes _(V2: P&L and outcome removed — auto-computed; quantity added)_
- [x] All fields are required — form does not submit with blanks
- [x] ~~P&L sign is validated against direction and price — contradiction triggers a warning~~ _(V2: replaced by auto-computed P&L)_
- [x] ~~P&L of $0.00 with Win or Loss outcome triggers a Breakeven suggestion~~ _(V2: replaced by auto-derived outcome)_
- [x] Can paste a chart screenshot from clipboard (Ctrl+V)
- [x] Can drag-and-drop an image file onto the form
- [x] Screenshot is saved to disk using the {date}_{trade_id}.png convention and displays in the detail view
- [x] Submitting the form saves the trade to SQLite and clears the form for next entry
- [x] When entering multiple trades in sequence, instrument and session carry over from the previous entry

### Setup Taxonomy
- [x] Can navigate to settings and add a new setup type label
- [x] Can rename an existing setup type label
- [x] Attempting to delete a setup type referenced by existing trades is blocked with an explanatory message
- [x] Deleting a setup type with zero trade references succeeds immediately
- [x] Setup type labels appear in the trade logger dropdown

### Strategy Rules Editor
- [x] Can select a setup type and open its rules editor
- [x] Structured fields are present: entry criteria, HTF confirmation, valid vs. premature entry, session filter
- [x] Free-text notes field is present per setup type
- [x] Rules are persisted to SQLite and survive app restart

### Trade Log Viewer
- [x] All logged trades appear in a table with columns: date, instrument, direction, session, setup type, outcome, P&L
- [x] Can sort by any column (ascending/descending)
- [x] Can filter by: instrument, session, setup type, outcome, date range
- [x] Stats panel shows: win rate, total trades, total P&L — reflecting current filters
- [x] Clicking a trade row opens the full detail view with screenshot
- [x] Missing screenshot shows placeholder, not an error

### Calendar View
- [x] A calendar displays trades by date
- [x] Each day cell shows: trade count, net P&L, win/loss color coding
- [x] Clicking a date navigates to that day's trades in the log viewer

### General
- [x] App launches on Windows 10/11 without errors
- [x] Minimum window size enforced at 1280 × 800 px
- [x] Data persists across app restarts
- [x] App works fully offline (no internet required)
- [x] Missing screenshot directory is created automatically on startup
- [x] Corrupted database shows an error screen with recovery instructions rather than crashing silently

### Infrastructure (completed pre-feature)
- [x] Initial Drizzle migration generated (`drizzle/migrations/0000_lethal_magdalene.sql`)
- [x] DB layer initialized in main process (`src/main/db/index.ts`) — opens SQLite at userData path, runs migrations, creates screenshots/ and logs/ directories
- [x] All IPC handlers registered (`src/main/ipc/index.ts`) — trade:*, setup-type:*, strategy-rules:* channels wired

---

## Milestone Roadmap

| Milestone | Summary |
|---|---|
| **MVP** | Manual trade journal, strategy rules editor, offline-only — complete |
| **V2** | Tradovate auto-import, strategy knowledge base, AI post-trade review, improved UI (dashboard, Trade View, new sidebar) |
| **V3** | Live assistant: real-time OHLCV feed, autonomous structure detection, mistake profile overlay |

---

## V2 Checklist

### Tradovate Auto-Import
- [x] Tradovate CSV parser module — parses Orders CSV, pairs fills FIFO, computes P&L from tick values
- [x] Import review queue IPC handlers — `pending_imports` schema + `import:enqueue/list/get/update/confirm/reject` channels + preload surface
- [ ] CSV file picker UI — user selects a Tradovate export file
- [ ] Review queue UI — parsed trades shown for user to assign session, setup type, notes before committing
- [ ] Tradovate REST API auto-sync (enhancement)

### Trade Model Updates (V2)
- [x] `quantity` column added to trades table (migration `0001_jazzy_northstar.sql`)
- [x] P&L auto-computed from prices, direction, instrument, and quantity (removed manual P&L entry)
- [x] Outcome auto-derived from P&L sign (removed manual outcome selection)
- [x] Shared constants module (`src/shared/constants.ts`) — enums and tick value map used by both form and parser

### Strategy Knowledge Base
- [x] `knowledge_base_entries` table, schema, and IPC handlers — `knowledge-base:list/get/create/update/delete` channels + preload surface; fixed category enum (9 values)
- [ ] Knowledge base editor UI
- [ ] AI reads knowledge base alongside strategy rules

### AI Post-Trade Review
- [ ] Anthropic API integration via `@anthropic-ai/sdk`
- [ ] API key storage via Electron `safeStorage`
- [ ] Post-trade review prompt with strategy rules and knowledge base context

### Improved UI
- [ ] Dashboard home page (stats + calendar + recent trades)
- [ ] Add Trade as sidebar action button
- [ ] Trade View for single-trade detail
- [ ] Remove standalone Log Viewer and Calendar pages

### Infrastructure (V2)
- [x] Test runner (vitest) — 61 unit tests across parser (19), import handlers (22), knowledge-base handlers (20)

---

## Deferred from MVP

| Feature | Milestone |
|---|---|
| AI post-trade review | V2 |
| Tradovate REST API auto-sync | V2 |
| Strategy knowledge base | V2 |
| Improved UI (dashboard, Trade View, new sidebar) | V2 |
| Mistake profile synthesis | V3 |
| Real-time OHLCV feed | V3 |
| Autonomous structure detection (FVGs, OBs, swing points, etc.) | V3 |
| Live rules layer | V3 |
| Scenario narration | V3 |
| Mistake overlay on live | V3 |
| Chart screenshot annotation | Later |
| Chart screenshot AI analysis (Claude Vision) | Later |
| Database export / import / backup | Later |
