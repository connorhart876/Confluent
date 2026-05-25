# Futures Co-Pilot: Tech Stack Research Report

**Date:** 2026-05-24
**Scope:** MVP through V3, evaluated against hard constraints

---

## Hard Constraints (from brainstorm.md)

| Constraint | Implication |
|---|---|
| Fully local, no cloud dependency | All data and computation on-device; only outbound calls are API requests (Anthropic, data feed) |
| Single-user Electron app | No auth, no server, no multi-tenant anything |
| SQLite storage | Single-file database, no install, no daemon |
| Anthropic API for AI features | Claude models via `@anthropic-ai/sdk`; requires internet for AI calls only |
| WebSocket OHLCV ingestion (V3) | Real-time futures data for ES, NQ, MES, MNQ |
| Windows desktop (primary) | Must run reliably on Windows 10/11 |

---

## Layer 1: Desktop Shell

### Option A: Electron (Recommended)

| Dimension | Assessment |
|---|---|
| **What it is** | Chromium + Node.js runtime bundled as a desktop app |
| **Bundle size** | ~150-200 MB |
| **RAM at idle** | ~200-300 MB |
| **Startup time** | 1-2 seconds |
| **Native module support** | Full Node.js native addon support (C++ via node-gyp); `better-sqlite3`, `sharp`, and every npm native module works out of the box |
| **Ecosystem maturity** | 12+ years, battle-tested by VS Code, Discord, Slack, Figma. Auto-update (electron-updater), code signing, Windows installer (NSIS/MSI) all have proven, documented paths |
| **Build tooling** | electron-vite (Vite-based, HMR for renderer + hot reload for main process), electron-builder for packaging |
| **Learning curve** | Low if you know web development; extensive documentation and community resources |
| **Cost** | Free and open source |

### Option B: Tauri 2

| Dimension | Assessment |
|---|---|
| **What it is** | OS-native WebView + Rust backend |
| **Bundle size** | ~2-12 MB (93% smaller than Electron) |
| **RAM at idle** | ~30-40 MB |
| **Startup time** | <0.5 seconds |
| **Native module support** | **No Node.js runtime.** Cannot use `better-sqlite3` or any npm native module. SQLite access requires Rust plugins (`tauri-plugin-sql` via sqlx) or WASM (`sql.js`). The frontend runs in a WebView with no `fs`, no `require`, no native bindings |
| **Ecosystem maturity** | Tauri 2.0 is stable but younger. Plugin ecosystem is thinner. Auto-update and Windows packaging work but have fewer community battle scars |
| **Build tooling** | Rust compilation step adds 30-60s to cold builds; hot reload on the frontend is fast |
| **Learning curve** | Requires Rust for any backend logic (file I/O, database, system calls). If you don't know Rust, this is a significant ramp |
| **Cost** | Free and open source |

### Verdict: Electron

Tauri wins on performance metrics that don't matter for this project. A trading co-pilot runs on a desktop with 16-32 GB RAM next to a broker platform, charting software, and a browser. The 200 MB footprint is irrelevant. What does matter:

- **better-sqlite3 works natively** in Electron's Node.js process. In Tauri, you'd need to rewrite the data layer in Rust or accept the slower sql.js WASM path.
- **Every npm package works.** YouTube transcript extraction, Anthropic SDK, Tradovate API client, charting libraries, WebSocket clients — all first-class.
- **No Rust required.** The entire app is JavaScript/TypeScript, which keeps the stack homogeneous and the learning curve flat.
- **Proven packaging on Windows.** NSIS installer, auto-update, code signing — all documented and battle-tested.

The 1-2 second startup and 200 MB RAM are acceptable tradeoffs for a tool that runs alongside a trading platform all session.

---

## Layer 2: Frontend Framework

### Option A: React (Recommended)

| Dimension | Assessment |
|---|---|
| **Ecosystem** | Largest by far — ~70-80% of frontend job postings. TanStack Query, Zustand, React Router, thousands of compatible libraries |
| **Component libraries** | Shadcn/ui, Radix UI, Headless UI — all React-first |
| **Electron integration** | The most common pairing. electron-react-boilerplate, electron-vite templates, extensive community support |
| **State management** | Zustand (lightweight, simple), Jotai, or TanStack Query for server-state patterns |
| **Learning resources** | Unmatched volume of tutorials, Stack Overflow answers, and Electron-specific guides |
| **Performance** | Virtual DOM adds overhead vs Svelte's compiled output, but irrelevant for a forms-and-tables desktop app |
| **Cost** | Free |

### Option B: Svelte

| Dimension | Assessment |
|---|---|
| **Ecosystem** | Smaller but growing. Fewer Electron-specific resources and component libraries |
| **Component libraries** | Skeleton UI, Svelte Headless UI — functional but less polished than React equivalents |
| **Electron integration** | Works via electron-vite but fewer templates and community examples |
| **Performance** | Compiles to vanilla JS with no runtime — smallest bundles, fastest DOM updates. Objectively superior performance |
| **Learning resources** | Excellent official docs, but far fewer community resources for Electron-specific patterns |
| **Cost** | Free |

### Option C: Vue 3

| Dimension | Assessment |
|---|---|
| **Ecosystem** | Strong, especially in Europe/Asia. Composition API is elegant |
| **Component libraries** | Vuetify, PrimeVue, Naive UI — mature options |
| **Electron integration** | Solid support via electron-vite; fewer templates than React but more than Svelte |
| **Performance** | Between React and Svelte — reactive system is efficient |
| **Cost** | Free |

### Verdict: React

Svelte's performance advantage is real but irrelevant for this app's UI complexity (forms, tables, text displays). React's value here is practical:

- **Shadcn/ui + Tailwind** is the best component library for building a polished desktop UI quickly, and it's React-native.
- **AI/LLM ecosystem** — streaming UI components, markdown renderers, chat interfaces — all have the most React support.
- **electron-vite + React** has multiple production-ready starter templates with Tailwind and Shadcn pre-configured.
- **Largest hiring pool** if you ever bring on help.

---

## Layer 3: UI Components & Styling

### Option A: Shadcn/ui + Tailwind CSS (Recommended)

| Dimension | Assessment |
|---|---|
| **What it is** | Copy-paste component collection built on Radix UI primitives + Tailwind CSS utility classes. You own the code — no dependency lock-in |
| **Component quality** | Tables, forms, dialogs, tabs, command palettes, dropdowns, toasts — covers 90%+ of this app's needs |
| **Customization** | Full control. Components are in your source tree. Tailwind theme tokens handle colors, spacing, typography globally |
| **Dark mode** | Built-in support via Tailwind's `dark:` variant and CSS variables |
| **Electron compatibility** | Multiple production boilerplates exist (electron-shadcn-typescript, electron-react-app). Proven path |
| **Cost** | Free |

### Option B: Ant Design / Material UI

| Dimension | Assessment |
|---|---|
| **What it is** | Full component frameworks with opinionated design systems |
| **Component quality** | Very comprehensive — more built-in components than Shadcn |
| **Customization** | Harder to deviate from the design system. Theme overrides, not source ownership |
| **Bundle size** | Significantly larger. Ant Design imports can bloat the renderer bundle |
| **Cost** | Free |

### Verdict: Shadcn/ui + Tailwind CSS

For a single-developer project, owning the component source code eliminates the "fight the framework" problem. Shadcn's table, form, dialog, and tab components map directly to the trade logger, rules editor, and knowledge base UIs described in the brainstorm. Tailwind's utility-first approach makes rapid iteration fast without writing custom CSS.

---

## Layer 4: Local Storage

### Option A: better-sqlite3 + Drizzle ORM (Recommended)

| Dimension | Assessment |
|---|---|
| **Driver: better-sqlite3** | C++ native Node.js addon. Synchronous API — ideal for SQLite's single-writer model. Fastest SQLite driver for Node.js in benchmarks. Well-maintained, 4M+ weekly npm downloads |
| **ORM: Drizzle** | Type-safe SQL query builder with first-class SQLite support via `drizzle-orm/better-sqlite3`. Schema defined in TypeScript, migrations via `drizzle-kit`. Thin abstraction — generates SQL you can read |
| **Electron compatibility** | Requires `electron-rebuild` to compile the native addon for Electron's Node.js version. This is a solved problem with documented steps. Some friction with drizzle-kit in production builds (run migrations at app startup, not via CLI) |
| **Schema migrations** | `drizzle-kit generate` creates SQL migration files. Apply them programmatically at app startup |
| **Performance** | 2-5x faster than async alternatives for typical CRUD. Synchronous reads don't block the renderer because they run in the main process (or a worker) |
| **Cost** | Free |

### Option B: sql.js (WASM SQLite)

| Dimension | Assessment |
|---|---|
| **What it is** | SQLite compiled to WebAssembly. Runs anywhere — browser, Node.js, Electron renderer |
| **No native compilation** | No `electron-rebuild` step. Drop-in. Works identically in dev and production |
| **Performance** | 2-5x slower than better-sqlite3 for write-heavy workloads. Loads a ~1 MB WASM binary at startup |
| **Drizzle support** | Yes, via `drizzle-orm/sql-js` |
| **Cost** | Free |

### Option C: Prisma

| Dimension | Assessment |
|---|---|
| **What it is** | Full ORM with schema DSL, migration system, and query engine |
| **Electron compatibility** | Prisma's query engine is a separate binary that must be bundled with the Electron app. Historically fragile on Windows with path issues |
| **Overhead** | Heavier than Drizzle — more abstraction, larger bundle, slower cold queries |
| **Cost** | Free |

### Verdict: better-sqlite3 + Drizzle ORM

better-sqlite3 is the performance winner and the standard choice for Electron + SQLite. Drizzle adds type-safe queries without the weight of Prisma. The `electron-rebuild` step is a one-time setup cost. sql.js is a viable fallback if native compilation becomes a persistent headache, but start with better-sqlite3.

**Schema design note:** The brainstorm implies a straightforward relational model: `trades`, `setups`, `strategy_rules`, `session_notes`, `knowledge_base_entries`, `screenshots` (blob or file path), `mistake_profiles`. Drizzle's SQLite schema definition handles all of this cleanly.

---

## Layer 5: AI Integration

### Only viable option: @anthropic-ai/sdk (Node.js)

| Dimension | Assessment |
|---|---|
| **Package** | `@anthropic-ai/sdk` — official Anthropic TypeScript/Node.js SDK. 7M+ weekly npm downloads |
| **Requirements** | Node.js 20+. API key stored locally (in SQLite settings table or OS keychain) |
| **Key features** | Streaming responses (SSE), tool use / function calling, vision (image input for chart screenshot analysis in Later phase), prompt caching (90% cost reduction on repeated context) |
| **Electron fit** | Runs in the main process. API calls go outbound from the user's machine — no server needed. The only cloud dependency in the entire app |
| **Recommended models by feature** | See cost analysis below |

### Cost Analysis for AI Features

The app makes API calls for specific, bounded tasks — not open-ended chat. Here's the cost profile:

| Feature | Model | Input Context | Output | Est. Cost/Call | Frequency |
|---|---|---|---|---|---|
| **Post-trade review** (V2) | Sonnet 4.6 | ~3-5K tokens (trade + rules + knowledge base excerpt) | ~500-1K tokens | ~$0.02-0.03 | 1-5x/day |
| **YouTube transcript processing** (V2) | Haiku 4.5 | ~5-15K tokens (transcript) | ~1-2K tokens | ~$0.01-0.02 | Occasional |
| **Mistake profile synthesis** (V3) | Sonnet 4.6 | ~10-20K tokens (trade history batch) | ~1-2K tokens | ~$0.05-0.08 | Weekly/manual |
| **Scenario narration** (V3) | Sonnet 4.6 | ~3-5K tokens (structure state + rules) | ~500 tokens | ~$0.02 | On-demand |
| **Chart screenshot analysis** (Later) | Sonnet 4.6 | Image + ~1K tokens | ~500 tokens | ~$0.03-0.05 | Occasional |

**Estimated monthly cost at active use:** $5-15/month. Prompt caching on the strategy rules and knowledge base context (which repeats across calls) can reduce this by 50-70%.

### Model Selection Strategy

- **Haiku 4.5** ($1/$5 per M tokens): Transcript summarization, simple extraction tasks. Fast, cheap.
- **Sonnet 4.6** ($3/$15 per M tokens): Post-trade review, mistake synthesis, scenario narration. Best quality-to-cost ratio for analytical writing. This is the workhorse model.
- **Opus 4.7** ($5/$25 per M tokens): Not needed. The tasks don't require Opus-level reasoning. Sonnet handles analytical writing well at 40% lower cost.

### Prompt Caching Strategy

The Strategy Rules Editor content and knowledge base are injected into most prompts. Using Anthropic's prompt caching:
- Cache the rules + knowledge base as a prefix (stays cached for 5 min)
- Append the trade-specific data as the variable suffix
- Cached input tokens cost 90% less ($0.30/M instead of $3/M for Sonnet)

At 3-5 reviews per trading session with the same rules context, caching cuts the per-session AI cost roughly in half.

---

## Layer 6: Real-Time Data Feed (V3)

### Option A: Polygon.io (now Massive)

| Dimension | Assessment |
|---|---|
| **Futures coverage** | CME Globex (CBOT, CME, NYMEX, COMEX) — covers ES, NQ, MES, MNQ |
| **Delivery** | WebSocket streaming API — native JavaScript WebSocket client works directly |
| **Data types** | Real-time trades, quotes, and OHLCV aggregates (1-min, 5-min, etc.) |
| **Pricing** | Rebranded to "Massive" in 2026. Pricing tiers not fully transparent on public page — historically $199-399/mo for real-time futures. Free tier exists for delayed/end-of-day equities but likely not for real-time futures |
| **API quality** | Clean REST + WebSocket API. Good documentation. Node.js client library available |
| **Latency** | Adequate for 1-min+ OHLCV bars. Not suitable for sub-second HFT (not needed here) |

### Option B: Databento (Recommended)

| Dimension | Assessment |
|---|---|
| **Futures coverage** | CME Globex MDP 3.0 — full ES, NQ, MES, MNQ coverage |
| **Delivery** | TCP socket-based API (lower latency than WebSocket) + REST for historical. Client libraries available for Python and C++; JavaScript would use their REST API or a TCP client |
| **Data types** | Subsampled BBO, last sale, OHLCV aggregates by second/minute/hour, daily stats |
| **Pricing** | Usage-based (pay-per-GB) or $199/mo Standard plan (includes full history in core schemas). Plus plan ($1,399/mo) adds live data. $125 free credits for new users |
| **API quality** | Modern, well-documented. CME Group technology vendor partner. Data quality is considered best-in-class for futures |
| **Latency** | Sub-millisecond capable, far beyond what this app needs |
| **JavaScript SDK** | No official JS SDK — would need REST API calls or community wrapper |

### Option C: Tradovate's Own Market Data API

| Dimension | Assessment |
|---|---|
| **Coverage** | Already connected to Tradovate for order data — their API also provides market data |
| **Advantage** | No additional vendor. Single API for both trade import and market data |
| **Limitation** | Tied to having an active Tradovate account. API documentation is thinner. Less reliable as a standalone data source |
| **Cost** | Included with Tradovate account (with data subscription) |

### Verdict: Databento (Standard Plan) — but defer until V3

Databento offers the best data quality for CME futures and a clean API. The $199/mo Standard plan with usage-based live data is the most cost-effective for a single-user app consuming 4 instruments on 1-min bars. However:

- **V3 is the first milestone that needs real-time data.** Don't sign up or integrate until V2 is complete.
- **Polygon.io (Massive) is a strong fallback** if Databento's lack of a JavaScript SDK creates friction. Polygon's WebSocket API works natively with browser/Node.js WebSocket clients.
- **Tradovate's own API** is worth prototyping first since you already need that integration for V2 trade import.

**Practical recommendation:** Start V3 by testing whether Tradovate's market data API provides adequate OHLCV data for the 4 instruments. If it does, you avoid an additional vendor entirely. If the data quality or reliability isn't sufficient, move to Databento Standard.

---

## Layer 7: Structure Detection (V3)

### The landscape

No JavaScript library exists for ICT-style structure detection (FVGs, order blocks, breaker blocks, swing structure). The existing libraries cover different ground:

| Library | What it does | What it doesn't do |
|---|---|---|
| **technicalindicators** (npm) | SMA, EMA, MACD, RSI, Bollinger, 100+ classic indicators | No FVG, OB, structure break, swing point detection. Pattern detection removed in v3 |
| **trading-signals** (npm) | Similar classic indicator set, TypeScript-native | Same gaps |
| **tulipnode** (npm) | 100+ indicators via C bindings (fast) | No ICT concepts. Requires native compilation |
| **candlestick** (npm) | 18 classic candlestick patterns (hammer, engulfing, etc.) | No market structure concepts |

### Recommendation: Custom Detection Module

The ICT/SMC concepts in the brainstorm (FVGs, OBs, session highs/lows, CE levels, structure breaks, swing points) are algorithmically straightforward given OHLCV data. They are:

- **FVG (Fair Value Gap):** Three-candle pattern where candle 1's high < candle 3's low (bullish) or candle 1's low > candle 3's high (bearish). A few lines of code per detection.
- **Order Block:** Last opposing candle before an impulsive move. Requires defining "impulsive" (e.g., displacement > N ATR).
- **Swing Points:** Local highs/lows using a lookback window. Classic zigzag algorithm.
- **Structure Break:** New high above prior swing high (bullish BOS) or new low below prior swing low (bearish BOS).
- **Session Highs/Lows:** Filter candles by timestamp range, take max(high) and min(low).
- **CE (Consequent Encroachment):** Midpoint of an FVG. Arithmetic.

**Build these as a pure TypeScript module** with no external dependencies. Each detection function takes an array of OHLCV candles and returns detected structures with price levels and timestamps. This is V3 work — by then, the data model and OHLCV ingestion pipeline will be in place.

Total implementation: ~500-1000 lines of TypeScript for all six detection types across multiple timeframes. No library needed.

---

## Layer 8: Supporting Integrations

### Tradovate Integration (V2)

| Approach | Assessment |
|---|---|
| **CSV Export** | Tradovate supports exporting trade history as CSV. Parse with `csv-parse` or `papaparse` npm packages. Simplest path — user exports from Tradovate, drags file into the app |
| **REST API** | Full API at api.tradovate.com with JavaScript examples on GitHub (tradovate/example-api-js). Supports OAuth authentication, order history, fills, positions. More complex but enables auto-sync |
| **Recommendation** | Start with CSV import in V2 (lower complexity, no auth flow). Add REST API auto-sync as a V2 enhancement if CSV friction is too high |

### YouTube Transcript Extraction (V2)

| Library | Assessment |
|---|---|
| **youtube-transcript** (npm) | Lightweight, 1.3.1 stable. Fetches transcripts via YouTube's internal API. No API key required |
| **youtube-transcript-plus** (npm) | More features (language selection, formatting). Node.js 20+ required |
| **Caveat** | All these libraries use unofficial YouTube APIs. They can break if YouTube changes their internal structure. Have a fallback plan (manual paste) |
| **Recommendation** | Use `youtube-transcript` for simplicity. The transcript is just text fed to Claude for summarization — doesn't need advanced features |

### Chart Screenshots (MVP)

| Approach | Assessment |
|---|---|
| **Clipboard paste** | Electron's `clipboard.readImage()` + `nativeImage` API. User copies from TradingView, pastes in app |
| **File drag-and-drop** | HTML5 drag-and-drop API in the renderer. Standard web pattern |
| **Storage** | Save as PNG/JPEG files in an app-managed directory. Store the file path in SQLite, not the blob. Keeps the database file small |
| **Recommendation** | Support both paste and drag-and-drop. Store files alongside the SQLite database in the app's userData directory |

---

## Recommended Stack Summary

| Layer | Choice | Key Reason |
|---|---|---|
| **Desktop Shell** | Electron | Native module support, npm ecosystem, proven Windows packaging |
| **Build Tooling** | electron-vite | Vite-based, HMR for renderer, hot reload for main process |
| **Frontend Framework** | React + TypeScript | Largest ecosystem, Shadcn/ui compatibility, AI/streaming UI support |
| **UI Components** | Shadcn/ui + Tailwind CSS | Own the code, fast iteration, great form/table/dialog components |
| **State Management** | Zustand | Minimal boilerplate, works well with Electron IPC patterns |
| **Local Database** | better-sqlite3 + Drizzle ORM | Fastest SQLite driver + type-safe queries. The correct Electron choice |
| **AI SDK** | @anthropic-ai/sdk | Official, streaming, tool use, vision, prompt caching |
| **AI Model (primary)** | Claude Sonnet 4.6 | Best cost/quality ratio for analytical review writing |
| **AI Model (lightweight)** | Claude Haiku 4.5 | Transcript summarization and simple extraction |
| **Tradovate Import** | CSV parse (V2), REST API (V2+) | Start simple, upgrade to auto-sync if needed |
| **YouTube Transcripts** | youtube-transcript (npm) | Lightweight, no API key, sufficient for this use case |
| **Data Feed (V3)** | Databento Standard or Tradovate API | Test Tradovate first; Databento if quality/reliability insufficient |
| **Structure Detection (V3)** | Custom TypeScript module | No library covers ICT concepts. Straightforward to build from OHLCV |
| **Chart Screenshots** | Electron clipboard + drag-and-drop | Native Electron APIs, store as files not blobs |

---

## Estimated Ongoing Costs

| Item | Cost | When |
|---|---|---|
| Anthropic API (active trading) | $5-15/month | V2 onward |
| Data feed (Databento Standard) | ~$199/month + usage | V3 only |
| Data feed (Tradovate, if sufficient) | Included with broker account | V3 only |
| Everything else | $0 | All phases |

**MVP and V2 cost: API usage only.** The app itself, all tooling, and all libraries are free. Real-time data is the only significant cost, and it doesn't arrive until V3.

---

## Starter Template Recommendation

Begin the MVP with this exact setup:

```
electron-vite create confluent --template react-ts
```

Then add:
- `shadcn/ui` + `tailwindcss` (follow the electron-shadcn integration guide)
- `better-sqlite3` + `drizzle-orm` + `drizzle-kit`
- `@anthropic-ai/sdk` (wire up in V2, but install the dependency early)
- `zustand` for state management

This gives you a running Electron + React + TypeScript app with HMR in under 10 minutes, and every subsequent dependency installs via npm with no additional build system configuration.
