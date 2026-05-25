# Project Status

_Update this file as work completes. Check off items as they pass manual verification._

---

## Current Milestone: MVP

A fully offline manual trade journal with user-defined strategy rules — no AI, no broker integration, no external dependencies.

**Status:** Not started

---

## MVP Checklist

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

---

## Milestone Roadmap

| Milestone | Summary |
|---|---|
| **MVP** | Manual trade journal, strategy rules editor, offline-only — in progress |
| **V2** | First AI layer: Claude post-trade review, Tradovate import, in-app strategy knowledge base |
| **V3** | Live assistant: real-time OHLCV feed, autonomous structure detection, mistake profile overlay |

---

## Deferred from MVP

| Feature | Milestone |
|---|---|
| AI post-trade review | V2 |
| Tradovate auto-import (CSV and REST API) | V2 |
| Session notes log | V2 |
| In-app strategy knowledge base | V2 |
| YouTube transcript processor | V2 |
| Mistake profile synthesis | V3 |
| Real-time OHLCV feed | V3 |
| Autonomous structure detection (FVGs, OBs, swing points, etc.) | V3 |
| Live rules layer | V3 |
| Scenario narration | V3 |
| Mistake overlay on live | V3 |
| Chart screenshot annotation | Later |
| Chart screenshot AI analysis (Claude Vision) | Later |
| Database export / import / backup | Later |
