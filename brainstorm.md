# Goal

A local Electron desktop app for ES, NQ, MES, and MNQ futures trading. The goal is a personal co-pilot that enforces strategy discipline — not a system that makes trading decisions. It logs trades against a user-defined ruleset, gives plain-language AI feedback on rule adherence, and in its final form watches live market structure and flags when historical error patterns are forming. All data stays local. No scoring, no execution, no cloud dependency.

# Futures Trading Co-Pilot — Project Milestones

---

## MVP — Functional Trade Journal + Strategy Foundation
*Core logging and rule definition. Smallest version with real daily value.*

| Feature | What it does | Why it's in MVP |
|---|---|---|
| Manual trade logger | Form to log a trade: instrument (ES, NQ, MES, MNQ), direction, entry/exit, session (NY AM 9:30–11am ET or Asian 8pm–12am ET), setup type, outcome, notes field | Foundation everything else is built on — no data, no AI |
| User-defined setup taxonomy | Setup type labels are defined by the user in settings — not hardcoded. The field structure (dropdowns, filters) is consistent; the vocabulary is yours | Controls structure without locking in terminology — consistent fields, flexible labels |
| Strategy Rules Editor | Per-setup section with a hybrid format: structured fields for entry criteria, HTF confirmation requirements, valid confirmation vs. premature entry, and session filters; plus a free-text field per setup for nuance, context, and hard no-trade exceptions | Becomes the prompt foundation for every AI feature — structured fields give the AI consistent signal; free-text captures the judgment calls structured fields can't |
| Local SQLite storage | All trade data stored locally in a SQLite database file on your machine | Persistent, queryable, no server needed |
| Trade log viewer | Sortable/filterable list of all logged trades with basic stats (win rate, total trades, P&L) | Makes the journal immediately useful without AI |
| Chart screenshot attach | Paste or drag a TradingView screenshot onto a trade entry — stored and displayed alongside the log; no in-app annotation in MVP | Visual context for every trade from day one |
| Basic Electron shell | Runs as a local desktop app on your machine, always accessible alongside your trading platform | Defines the "runs locally" requirement |

---

## V2 — Richer Data + AI Post-Trade Review
*First AI layer — after logging discipline is established.*

| Feature | What it does | Why it's in V2 |
|---|---|---|
| Tradovate auto-import | Ingest fills, timestamps, and P&L directly from Tradovate CSV export or Tradovate REST API; auto-imported trades enter a review queue before being confirmed to the main log | Eliminates manual entry friction for execution data — Tradovate is the active broker |
| Strategy knowledge base | Structured in-app section for writing and organizing strategy notes — entry model, HTF context requirements, setup-specific rules, known mistakes. AI reads this alongside the Strategy Rules Editor when reviewing trades | Gives Claude the full picture of your system so post-trade review is accurate rather than generic |
| AI post-trade review | After a trade is logged, Claude analyzes it against your Strategy Rules Editor definitions and strategy knowledge base; produces a written summary of what was done well, what was violated, and why each violation matters technically | First real AI value — rule adherence feedback in plain language on every trade |
| Improved UI | New layout: Dashboard as home page (stats + calendar + recent trades), Add Trade as a sidebar action button, Trade View for single-trade detail, standalone Log Viewer and Calendar pages removed | V1 can be rough — V2 is something you want to open daily |

---

## V3 — Mistake Engine + Live Assistant
*Full co-pilot — requires substantial trade history and a mature knowledge base to be meaningful.*

| Feature | What it does | Why it's in V3 |
|---|---|---|
| Mistake profile synthesis | Periodic review that condenses trade logs into a compressed, hyper-specific technical mistake profile — stored in the knowledge base and injected into live sessions. Trigger is configurable: defaults to auto-prompt at 20-trade or 7-day threshold; can be disabled and run manually | Requires enough logged trades to be statistically meaningful |
| Real-time OHLCV feed | WebSocket connection to a real-time data provider (Polygon.io or equivalent) ingesting multi-timeframe OHLCV data for ES, NQ, MES, and MNQ displayed within the app | Prerequisite for all live assistant features |
| Autonomous structure detection | App continuously calculates detectable conditions from raw OHLCV: FVGs, OBs, session highs/lows, CE levels, structure breaks, swing points — across multiple timeframes without manual input | Removes mechanical scanning work so your judgment focuses on context quality |
| Live rules layer | Calculated conditions are checked against your Strategy Rules Editor definitions in real time — confirms which setup criteria are or aren't currently met. Results shown as pass/fail per criterion, no quality scores | Depends on live feed + well-defined rules from MVP |
| Scenario narration | Given current detected structure, AI describes what would need to happen next for each setup type to form — so you're watching, not chasing | Highest-value live feature — requires rules layer to function |
| Mistake overlay on live | Mistake profile injected into live session context — if a forming setup matches a historical error pattern, AI flags it with a specific technical reference | Requires mistake profile engine from same version |

> **Honest ceiling on autonomous analysis:** The system can algorithmically detect mechanical setup conditions (FVGs, OBs, structure breaks, CE levels). It cannot fully automate the contextual judgment of whether a setup is quality — that discretionary read is your edge and remains yours.

---

## Later — Nice-to-Have / Speculative

| Feature | Description |
|---|---|
| Chart screenshot AI analysis | Claude Vision reads a pasted chart screenshot and identifies visible structure (HTF levels, imbalances, displacement) — useful for logging context, not reliable as a primary signal source |
| Chart screenshot annotation | In-app markup tools (arrows, boxes, labels) applied to stored screenshots before or after logging a trade |
| Weekly performance report | Auto-generated structured review: best/worst setups, rule adherence rate, mistake recurrence trends |
| Setup heat map | Visual breakdown of win rate by setup type, session time, and HTF context — surfaces where your actual edge lives |
| Voice session notes | Speak session notes during trading rather than typing — transcribed and logged automatically |

---

## Not in Scope — Explicitly Excluded

| Feature | Reason excluded |
|---|---|
| Setup quality ratings or scores | Creates false precision and anchors judgment. Rule-check pass/fail is acceptable; numerical scores, grades, or probability ratings on setups or executions are not |
| Automated trade execution | Not a co-pilot if it trades for you |
| Multi-user / login system | Personal tool — authentication adds complexity with zero benefit |
| Mobile app | Desktop-only — you're trading at a desk |
| Backtesting engine | Different problem, different toolset — out of scope for a journal/assistant |
| P&L / tax reporting | Your broker handles this better than a custom tool will |
