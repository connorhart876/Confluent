# CLAUDE.md — Confluent

## Project Overview

Confluent is a **local Electron desktop app** for futures trading discipline. It is a personal co-pilot that logs trades against a user-defined ruleset and enforces strategy discipline through structure — not a system that makes trading decisions.

**Current scope: MVP only.** MVP is a fully offline manual trade journal with strategy rules definition. No AI, no broker integration, no external API calls.

**What Confluent is not:**
- Not a trading system, signal generator, or execution engine
- Not multi-user, not SaaS, not cloud-hosted
- Not a mobile app
- Not a backtesting platform or P&L/tax reporter

## Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Desktop shell | Electron | 35.7.5 | |
| Build tooling | electron-vite | ^3.0.0 | Vite-based; HMR for renderer, hot reload for main |
| Frontend | React + TypeScript | 18.3.1 / 5.9.3 | Strict mode |
| UI components | Shadcn/ui + Radix UI primitives | (copied source) | Components are owned source code, not a package dep |
| Styling | Tailwind CSS | ^3.4.17 | Utility-first; dark mode via `class` strategy |
| State management | Zustand | ^5.0.3 | Renderer-side UI state only |
| Database | better-sqlite3 | ^11.9.1 | Native C++ addon, synchronous API |
| ORM | drizzle-orm | ^0.43.1 | Type-safe queries; `drizzle-orm/better-sqlite3` adapter |
| Migrations | drizzle-kit | ^0.30.4 | Generates SQL migration files; applied at app startup |
| Forms | react-hook-form | ^7.54.2 | Renderer only |
| Form validation bridge | @hookform/resolvers | ^3.x | Connects zod schemas to react-hook-form |
| Validation | zod | ^3.24.2 | Schema validation for IPC payloads and forms |
| Dates | date-fns | ^4.1.0 | Date formatting and arithmetic |
| CSS utilities | clsx + tailwind-merge | ^2.1.1 / ^2.6.0 | Powers the `cn()` helper used by Shadcn components |
| CSS variants | class-variance-authority | ^0.7.x | Variant utility used by Shadcn components |
| Animation | tailwindcss-animate | ^1.x | Tailwind plugin for Radix UI entry/exit animations |
| Icons | lucide-react | ^0.x | Icon set used throughout the UI |
| Radix UI primitives | @radix-ui/react-slot, react-label, react-select, react-toggle-group, react-dialog, react-toast | (various) | Accessibility primitives underlying Shadcn components |
| AI SDK (V2+) | @anthropic-ai/sdk | — | **Not installed in MVP** |

### Native Module Setup

better-sqlite3 is a native C++ addon that must be compiled for Electron's bundled Node.js — not the system Node.js. The `postinstall` script handles this automatically:

```bash
npm install          # installs packages, then runs postinstall
                     # postinstall: electron-rebuild -f -w better-sqlite3
```

If `electron-rebuild` fails (e.g. Python/VS toolchain issues), skip scripts and rebuild manually:

```bash
npm install --ignore-scripts
npx @electron/rebuild -f -w better-sqlite3
```

The binary at `node_modules/better-sqlite3/build/Release/better_sqlite3.node` is compiled for Electron's ABI, not the system Node ABI — loading it with `node` directly will throw `ERR_DLOPEN_FAILED`. This is expected and correct.

## Architecture

### Process Split

- **Main process:** owns SQLite (via better-sqlite3 + Drizzle), file system (screenshots, config), and all IPC handlers
- **Renderer process:** React UI only. **No direct DB access. No direct filesystem access.**
- **Communication:** typed IPC channels via `ipcRenderer.invoke()` / `ipcMain.handle()`. Channel names use `domain:action` format (e.g., `trade:create`, `trade:list`, `setup-type:delete`)

### Hard Rules

- All database reads and writes happen in the main process
- All file system operations happen in the main process
- The renderer communicates exclusively through IPC
- Screenshots are stored as files on disk; only the path is stored in SQLite
- API keys (V2+) use Electron `safeStorage` → Windows Credential Manager — never plaintext, never in .env for production

### File System Layout

```
%APPDATA%/confluent/
├── confluent.db              # SQLite database
├── screenshots/              # Chart screenshots (PNG)
│   └── {YYYY-MM-DD}_{trade_id}.png
└── logs/                     # App logs
```

## Data Model

### Tables (MVP)

**trades**
- `id` INTEGER PK
- `instrument` TEXT — enum: ES, NQ, MES, MNQ
- `direction` TEXT — enum: Long, Short
- `entry_price` REAL
- `exit_price` REAL
- `entry_time` TEXT — ISO 8601 UTC
- `exit_time` TEXT — ISO 8601 UTC
- `session` TEXT — enum: "NY AM", "Asian"
- `setup_type_id` INTEGER FK → setup_types.id
- `outcome` TEXT — enum: Win, Loss, Breakeven
- `pnl` REAL
- `notes` TEXT
- `screenshot_path` TEXT — relative to screenshots dir, nullable
- `created_at` TEXT — ISO 8601 UTC
- `updated_at` TEXT — ISO 8601 UTC

**setup_types**
- `id` INTEGER PK
- `name` TEXT — unique, user-defined
- `created_at` TEXT
- `updated_at` TEXT

**strategy_rules** (one-to-one with setup_types)
- `id` INTEGER PK
- `setup_type_id` INTEGER FK → setup_types.id (unique)
- `entry_criteria` TEXT
- `htf_confirmation` TEXT
- `valid_vs_premature` TEXT
- `session_filter` TEXT
- `freeform_notes` TEXT
- `created_at` TEXT
- `updated_at` TEXT

### Constraints

- All timestamps are ISO 8601 strings in UTC
- `setup_type_id` in trades is a FK — cannot delete a setup_type referenced by any trade (block deletion, suggest rename)
- `strategy_rules.setup_type_id` is unique — exactly one rules definition per setup type
- Screenshot paths are relative to the app's screenshots directory
- Future tables (V2+): `session_notes`, `knowledge_base_entries`, `mistake_profiles`

## Design / UX Constraints

- **Minimum window:** 1280 × 800 px (enforced by Electron)
- **Default window:** 1440 × 900 px
- **Layout:** Fixed left sidebar (Trade Logger, Log Viewer, Calendar, Strategy Rules, Settings) + main content area
- **Desktop-only.** No responsive layout, no mobile breakpoints, no touch optimization
- **Batch entry flow:** instrument and session carry over between consecutive trade entries
- **P&L validation:** sign-check against direction/price (warn, don't block); zero-check suggests Breakeven
- **Visual design reference:** Tradezella — clean, data-dense trade journal aesthetic with a simple dark theme. Use Tailwind's `dark:` variant throughout; no light mode required

## Project Policies

**These apply to the entire codebase, all milestones, permanently:**

- **No external API calls in MVP.** The app is fully offline at MVP. No network requests whatsoever
- **No scoring, ratings, grades, or probability numbers anywhere.** Pass/fail rule checks are OK. Numerical quality scores, letter grades, or probability ratings on setups or executions are permanently banned
- **No automated trade execution.** The app never places, modifies, or cancels orders
- **No multi-user logic.** No auth, no login, no user accounts, no permissions, no sessions
- **No P&L auto-calculation in MVP.** Contract multipliers and fee structures vary — manual entry with validation only

## Coding Standards

- **TypeScript strict mode** (`strict: true` in tsconfig)
- **Typed IPC channels.** Define a shared type for every IPC channel's request and response. No `any` crossing the IPC bridge
- **All DB writes in main process.** Never import better-sqlite3 or Drizzle in renderer code
- **Drizzle schema is the source of truth** for the database shape. No raw `CREATE TABLE` outside of generated migrations
- **No comments unless the WHY is non-obvious.** Don't explain what code does; name things clearly instead
- **No feature flags, backwards-compat shims, or premature abstractions.** Build what the spec says, nothing more
- **Error handling:** screenshots missing → placeholder, DB write fail → error toast + retry, corrupt DB → error screen with path and instructions

## Repo Etiquette

### Branches

- `main` — stable, always builds
- `feature/<short-name>` — new feature work (e.g., `feature/trade-logger`, `feature/calendar-view`)
- `fix/<short-name>` — bug fixes (e.g., `fix/pnl-validation`)
- `chore/<short-name>` — tooling, config, deps (e.g., `chore/tailwind-setup`)
- `dev` — accumulates finished issue work. Feature branches merge here.
- Merge to `main` at milestone boundaries only. Never commit directly to main.

### Commits

Format: `<type>: <what changed>`

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`

Examples:
- `feat: add trade logger form with all required fields`
- `fix: correct P&L sign validation for short trades`
- `chore: configure drizzle-kit for SQLite migrations`
- `docs: update project spec with calendar view details`

Keep commits atomic — one logical change per commit. Don't bundle unrelated changes.

## Common Commands

```bash
# Development
npm run dev              # Start Electron app with HMR (electron-vite)

# Build
npm run build            # Production build
npm run preview          # Preview production build locally

# Code quality
npm run typecheck        # TypeScript type checking (both main and renderer tsconfigs)
npm run lint             # ESLint

# Native modules
npm run rebuild          # Recompile better-sqlite3 for current Electron version
                         # Run this after upgrading Electron or better-sqlite3

# Database
npm run db:generate      # Generate SQL migration file from schema changes (drizzle-kit)
npm run db:studio        # Open Drizzle Studio visual DB browser (dev only)
```

## Key Files

- `brainstorm.md` — product vision, milestone definitions (MVP / V2 / V3 / Later / Not in Scope)
- `project_spec.md` — full MVP specification, data model, error handling, success checklist
- `research_report_tech_stack.md` — tech stack evaluation and rationale for every choice
- `docs/ARCHITECTURE.md` — process model, IPC layer, data layer, file system, frontend structure, dependency boundaries
- `docs/REFERENCE.md` — feature-by-feature reference: behavior, constraints, and edge cases for every MVP feature
- `docs/STATUS.md` — current milestone, MVP completion checklist, milestone roadmap, deferred features
- `docs/CHANGELOG.md` — versioned change history; [Unreleased] section for in-progress work
- `.claude/commands/update-docs.md` — `/update-docs` slash command to keep all docs in sync
