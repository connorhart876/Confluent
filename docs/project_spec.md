# Confluent — Futures Trading Co-Pilot: Project Specification

**Version:** 1.0
**Date:** 2026-05-24
**Scope:** MVP (V2 and V3 referenced for context only)

---

## 1. Product Requirements

### 1.1 Purpose

A local desktop application for personal futures trading discipline. It serves two equally important goals:

1. **Logging discipline** — a reliable, structured place to journal every trade so the habit of consistent record-keeping becomes automatic.
2. **Rule adherence** — a framework for defining trading rules per setup type, so that future AI review (V2) can evaluate each trade against the user's own system.

The app is not a trading system. It does not make decisions, score setups, or execute orders. It is a co-pilot that enforces discipline through structure and, eventually, plain-language feedback.

### 1.2 User Profile

Single user. Trades ES, NQ, MES, and MNQ futures on Tradovate. Operates in two fixed sessions: NY AM (9:30–11:00 AM ET) and Asian (8:00 PM–12:00 AM ET). Logs trades after the session ends, not in real-time during execution.

### 1.3 MVP Feature Set

#### Trade Logger

A form to log a completed trade. All fields are required:

| Field | Type | Details |
|---|---|---|
| Instrument | Dropdown | ES, NQ, MES, MNQ |
| Direction | Toggle | Long / Short |
| Entry price | Number | Decimal, e.g. 5423.75 |
| Exit price | Number | Decimal |
| Entry time | Datetime | Date and time of entry |
| Exit time | Datetime | Date and time of exit |
| Session | Dropdown | NY AM (9:30–11am ET), Asian (8pm–12am ET) |
| Setup type | Dropdown | User-defined labels from settings |
| Outcome | Select | Win / Loss / Breakeven |
| P&L | Number | Dollar amount, positive or negative |
| Notes | Text area | Free-form text for context, observations, mistakes |
| Chart screenshot | File attach | Paste from clipboard or drag-and-drop. Stored as a file on disk; path saved in database |

The form is designed for batch entry after a session. The flow should support entering multiple trades in sequence without unnecessary friction (e.g., instrument and session carry over from the previous entry within the same batch).

#### User-Defined Setup Taxonomy

In the app's settings, the user defines setup type labels (e.g., "FVG Sweep," "OB Rejection," "Silver Bullet"). These labels populate the setup type dropdown in the trade logger. The field structure (dropdowns, filters) is consistent across setups; the vocabulary is the user's own.

#### Strategy Rules Editor

A per-setup section with a hybrid format:

- **Structured fields:** Entry criteria, HTF confirmation requirements, valid confirmation vs. premature entry conditions, session filters
- **Free-text field:** Per-setup area for nuance, context, judgment calls, and hard no-trade exceptions

This editor becomes the prompt foundation for every AI feature in V2+. The structured fields give AI consistent, parseable signal; the free-text captures what structured fields cannot.

#### Trade Log Viewer

A sortable, filterable list of all logged trades with:

- **Columns:** Date, instrument, direction, session, setup type, outcome, P&L, notes (truncated)
- **Filters:** By instrument, session, setup type, outcome, date range
- **Sort:** By any column, ascending/descending
- **Basic stats panel:** Win rate, total trades, total P&L (filtered to current view)
- **Detail view:** Clicking a trade opens its full details including screenshot

#### Calendar View

A calendar interface showing trades by date. Each day cell displays a summary (number of trades, net P&L, win/loss color coding). Clicking a date navigates to that day's trades in the log viewer.

**Note:** Calendar view is derived entirely from the `trades` table — no separate data model is required.

#### Chart Screenshot Attach

- **Paste:** Copy a screenshot from TradingView (or any source), paste into the trade entry form via Ctrl+V
- **Drag-and-drop:** Drag an image file onto the trade entry form
- **Display:** Screenshot is shown alongside the trade in the detail view
- **Storage:** Saved as a PNG/JPEG file in an app-managed directory within the Electron userData path. The file path is stored in SQLite, not the image bytes
- **No annotation in MVP.** Store-and-display only

#### Settings

- Setup taxonomy management (add, rename, delete setup type labels)
- TBD: Any additional user preferences

---

## 2. Technical Architecture

### 2.1 App Identity

| Property | Value |
|---|---|
| App name | Confluent |
| Electron app ID | com.confluent.app |
| userData path (Windows) | %APPDATA%/confluent/ |

### 2.2 Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron |
| Build tooling | electron-vite |
| Frontend framework | React + TypeScript |
| UI components | Shadcn/ui + Tailwind CSS |
| State management | Zustand |
| Local database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM (drizzle-orm/better-sqlite3) |
| Schema migrations | drizzle-kit (generate SQL), applied programmatically at app startup |
| AI SDK (V2+) | @anthropic-ai/sdk |
| AI model (V2+) | Claude Sonnet 4.6 (primary), Claude Haiku 4.5 (lightweight tasks) |

### 2.3 Window and Layout

| Property | Value |
|---|---|
| Minimum window size | 1280 × 800 px |
| Default window size | 1440 × 900 px |
| Layout structure | Fixed left sidebar (navigation) + main content area |
| Sidebar nav items | Trade Logger, Log Viewer, Calendar, Strategy Rules, Settings |

The app is desktop-only and assumes a single monitor at standard trading desk resolution. No responsive/mobile layout is required.

### 2.4 Process Architecture

```
┌─────────────────────────────────────────────────┐
│                 Electron Main Process            │
│                                                  │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │ better-sqlite3│  │ File System Manager    │   │
│  │ + Drizzle ORM │  │ (screenshots, config)  │   │
│  └──────┬───────┘  └──────────┬─────────────┘   │
│         │                     │                  │
│         └─────────┬───────────┘                  │
│                   │                              │
│           ┌───────┴────────┐                     │
│           │  IPC Handlers  │                     │
│           └───────┬────────┘                     │
│                   │                              │
├───────────────────┼──────────────────────────────┤
│                   │  Electron IPC Bridge          │
├───────────────────┼──────────────────────────────┤
│                   │                              │
│  ┌────────────────┴─────────────────────────┐   │
│  │          Renderer Process (React)         │   │
│  │                                           │   │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ │   │
│  │  │ Trade   │ │ Strategy │ │ Settings  │ │   │
│  │  │ Logger  │ │ Rules    │ │ Page      │ │   │
│  │  │ + Log   │ │ Editor   │ │           │ │   │
│  │  │ Viewer  │ │          │ │           │ │   │
│  │  └─────────┘ └──────────┘ └───────────┘ │   │
│  │  ┌───────────────────────────────────┐   │   │
│  │  │ Zustand Store (UI state)          │   │   │
│  │  └───────────────────────────────────┘   │   │
│  └──────────────────────────────────────────┘   │
│                Electron Renderer Process         │
└─────────────────────────────────────────────────┘
```

**Communication pattern:** The renderer invokes typed IPC channels (e.g., `invoke('trade:create', data)`) to the main process. The main process handles all database reads/writes and file system operations, then returns results to the renderer. The renderer never accesses SQLite or the filesystem directly.

### 2.5 Data Model

```
┌─────────────────────┐       ┌──────────────────────┐
│       trades         │       │     setup_types       │
├─────────────────────┤       ├──────────────────────┤
│ id          INTEGER PK│◄──┐  │ id        INTEGER PK │
│ instrument  TEXT      │   │  │ name      TEXT        │
│ direction   TEXT      │   │  │ created_at TEXT       │
│ entry_price REAL      │   │  │ updated_at TEXT       │
│ exit_price  REAL      │   │  └──────────────────────┘
│ entry_time  TEXT      │   │
│ exit_time   TEXT      │   │  ┌──────────────────────┐
│ session     TEXT      │   │  │   strategy_rules      │
│ setup_type_id INTEGER FK├───┘  ├──────────────────────┤
│ outcome     TEXT      │      │ id        INTEGER PK │
│ pnl         REAL      │      │ setup_type_id INT FK │
│ notes       TEXT      │      │ entry_criteria TEXT   │
│ screenshot_path TEXT  │      │ htf_confirmation TEXT │
│ created_at  TEXT      │      │ valid_vs_premature TEXT│
│ updated_at  TEXT      │      │ session_filter TEXT   │
└─────────────────────┘      │ freeform_notes TEXT   │
                              │ created_at TEXT       │
                              │ updated_at TEXT       │
                              └──────────────────────┘
```

**Notes:**
- Timestamps stored as ISO 8601 strings in UTC
- `setup_type_id` is a foreign key to `setup_types`
- `screenshot_path` is relative to the app's screenshots directory
- `strategy_rules` has a one-to-one relationship with `setup_types` — each setup type has exactly one rules definition
- Calendar view is derived entirely from the `trades` table — no additional table required
- Future tables (V2+): `session_notes`, `knowledge_base_entries`, `mistake_profiles`

### 2.6 Screenshot Filename Convention

Screenshots are saved to `%APPDATA%/confluent/screenshots/` using the following naming convention:

```
{YYYY-MM-DD}_{trade_id}.png
```

Example: `2026-05-24_42.png`

- Date is the trade entry date in local time (display only — all DB timestamps remain UTC)
- `trade_id` is the SQLite row ID of the trade, assigned at insert time
- File extension is always `.png` regardless of source format — images are normalized to PNG on save
- If a trade's screenshot is later deleted or moved externally, the app displays a "Screenshot not found" placeholder in the detail view rather than throwing an error

### 2.7 P&L Validation

P&L is a manually entered field. The app performs the following validation on submit:

- **Sign check:** If direction is Long and exit price > entry price, P&L must be positive. If direction is Long and exit price < entry price, P&L must be negative. Inverse logic applies for Short. If the entered P&L sign contradicts the price direction, the form displays a warning and requires explicit confirmation before saving. It does not block submission — the user may override (e.g. partial fills, fees) — but silent contradictions are flagged.
- **Zero check:** A P&L of exactly $0.00 with outcome set to Win or Loss triggers a warning suggesting Breakeven may be the correct outcome.

Auto-calculation of P&L from entry/exit prices is not implemented in MVP — contract multipliers and fee structures vary and would require additional configuration. Manual entry with validation is the MVP approach.

### 2.8 Setup Type Deletion Behavior

When the user attempts to delete a setup type label from settings:

1. The app checks whether any trades in the `trades` table reference that `setup_type_id`
2. **If no trades reference it:** deletion proceeds immediately
3. **If trades reference it:** the app blocks deletion and displays a message: *"[Setup Name] is referenced by [N] trades and cannot be deleted. Rename it instead, or reassign those trades first."*
4. Reassignment is handled by editing individual trades in the log viewer — no bulk reassign tool in MVP

This prevents orphaned `setup_type_id` foreign keys in the trades table.

### 2.9 File System Layout

```
%APPDATA%/confluent/
├── confluent.db              # SQLite database
├── screenshots/              # Chart screenshot images
│   ├── 2026-05-24_42.png
│   ├── 2026-05-24_43.png
│   └── ...
└── logs/                     # App logs (errors, startup)
```

### 2.10 Error Handling and Data Integrity

| Scenario | Behavior |
|---|---|
| Screenshot file missing at display time | Show "Screenshot not found" placeholder — do not throw or crash |
| SQLite write failure on trade submit | Display error toast, do not clear form, allow retry |
| App closed mid-form entry | Form state is not persisted — unsaved trades are lost. No autosave in MVP |
| Database file missing at startup | App creates a new empty database and runs migrations — fresh start |
| Database file corrupted at startup | App displays an error screen with the DB file path and instructions to delete and restart |
| Screenshot directory missing | App creates it on startup if it does not exist |

### 2.11 API Key Storage (V2+)

The Anthropic API key is stored via Electron's `safeStorage` API, which uses the OS credential store (Windows Credential Manager). The key is encrypted at rest and only accessible to the app process. The user enters their API key in settings; the app encrypts and persists it.

### 2.12 External Dependencies

| Dependency | When | Purpose | Internet Required |
|---|---|---|---|
| Anthropic API | V2+ | Post-trade AI review, transcript processing, mistake synthesis | Yes |
| Tradovate API/CSV | V2+ | Auto-import trade fills and P&L | Yes (API) / No (CSV) |
| Data feed provider | V3 | Real-time OHLCV for ES, NQ, MES, MNQ | Yes |
| YouTube transcript | V2 | Extract video transcripts for knowledge base | Yes |

**MVP has zero external dependencies.** The app is fully offline-capable at MVP.

---

## 3. Non-Goals

These are explicitly excluded from the entire project, not just MVP:

| Non-Goal | Reason |
|---|---|
| Setup quality ratings or numerical scores | Creates false precision and anchors judgment. Pass/fail rule checks are OK; grades, scores, or probability ratings are not |
| Automated trade execution | Not a co-pilot if it trades for you |
| Multi-user / login system | Personal tool — authentication adds complexity with zero benefit |
| Mobile app | Desktop-only — trading happens at a desk |
| Backtesting engine | Different problem, different toolset |
| P&L / tax reporting | Broker handles this better |

### MVP-Specific Non-Goals

These are deferred to V2 or later — not in MVP:

| Deferred Feature | Milestone |
|---|---|
| AI post-trade review | V2 |
| Tradovate auto-import | V2 |
| Session notes log | V2 |
| In-app strategy knowledge base | V2 |
| YouTube transcript processor | V2 |
| Mistake profile synthesis | V3 |
| Real-time OHLCV feed | V3 |
| Autonomous structure detection | V3 |
| Live rules layer | V3 |
| Scenario narration | V3 |
| Mistake overlay on live | V3 |
| Chart screenshot annotation | Later |
| Chart screenshot AI analysis | Later |
| Database export/import/backup | Later |

---

## 4. Success Criteria

MVP is complete when every item on this checklist passes manual verification:

### Trade Logger
- [ ] Can open the app and see the trade entry form
- [ ] All required fields are present: instrument, direction, entry price, exit price, entry time, exit time, session, setup type, outcome, P&L, notes
- [ ] All fields are required — form does not submit with blanks
- [ ] P&L sign is validated against direction and price — contradiction triggers a warning
- [ ] P&L of $0.00 with Win or Loss outcome triggers a Breakeven suggestion
- [ ] Can paste a chart screenshot from clipboard (Ctrl+V)
- [ ] Can drag-and-drop an image file onto the form
- [ ] Screenshot is saved to disk using the {date}_{trade_id}.png convention and displays in the detail view
- [ ] Submitting the form saves the trade to SQLite and clears the form for next entry
- [ ] When entering multiple trades in sequence, instrument and session carry over from the previous entry

### Setup Taxonomy
- [ ] Can navigate to settings and add a new setup type label
- [ ] Can rename an existing setup type label
- [ ] Attempting to delete a setup type referenced by existing trades is blocked with an explanatory message
- [ ] Deleting a setup type with zero trade references succeeds immediately
- [ ] Setup type labels appear in the trade logger dropdown

### Strategy Rules Editor
- [ ] Can select a setup type and open its rules editor
- [ ] Structured fields are present: entry criteria, HTF confirmation, valid vs. premature entry, session filter
- [ ] Free-text notes field is present per setup type
- [ ] Rules are persisted to SQLite and survive app restart

### Trade Log Viewer
- [ ] All logged trades appear in a table with columns: date, instrument, direction, session, setup type, outcome, P&L
- [ ] Can sort by any column (ascending/descending)
- [ ] Can filter by: instrument, session, setup type, outcome, date range
- [ ] Stats panel shows: win rate, total trades, total P&L — reflecting current filters
- [ ] Clicking a trade row opens the full detail view with screenshot
- [ ] Missing screenshot shows placeholder, not an error

### Calendar View
- [ ] A calendar displays trades by date
- [ ] Each day cell shows: trade count, net P&L, win/loss color coding
- [ ] Clicking a date navigates to that day's trades in the log viewer

### General
- [ ] App launches on Windows 10/11 without errors
- [ ] Minimum window size enforced at 1280 × 800 px
- [ ] Data persists across app restarts
- [ ] App works fully offline (no internet required)
- [ ] Missing screenshot directory is created automatically on startup
- [ ] Corrupted database shows an error screen with recovery instructions rather than crashing silently

### Validation Method

MVP is validated by completing the above checklist through manual testing. No specific timeline target — ship when the checklist is fully satisfied.

---

## Appendix: V2+ Context (For Reference Only)

This section is not part of the MVP scope. It is included so that MVP architectural decisions can be informed by what comes next.

### V2 — AI Post-Trade Review

- Anthropic API integration via `@anthropic-ai/sdk`
- API key stored in OS credential store via Electron `safeStorage`
- Claude Sonnet 4.6 analyzes each trade against the Strategy Rules Editor definitions
- Output: written summary of what was done well, what was violated, and why each violation matters
- Prompt caching on strategy rules + knowledge base context to reduce API cost
- Tradovate CSV import (initial), REST API auto-sync (enhancement) with review-before-logging queue
- In-app strategy knowledge base
- YouTube transcript extraction and AI summarization into knowledge base

### V3 — Mistake Engine + Live Assistant

- Real-time OHLCV feed (Databento or Tradovate API) for ES, NQ, MES, MNQ
- Custom TypeScript module for structure detection: FVGs, OBs, swing points, structure breaks, session highs/lows, CE levels
- Live rules layer checking detected conditions against Strategy Rules Editor
- AI scenario narration and mistake overlay

### Tradovate Auto-Import Review Queue (V2)

Auto-imported trades from Tradovate enter a **review queue** — they are not logged directly. The user reviews each auto-imported trade, adds required context (setup type, notes, screenshot), and explicitly confirms before the trade is saved to the main trade log. This ensures the user remains engaged with the journaling process even when execution data is pulled automatically.
