# TradeLog — Personal Trading Journal

A modern, dark-mode-first personal trading journal built with **React + TypeScript + Vite**. All data is stored locally in your browser using **IndexedDB (Dexie.js)** — no backend, no server, no account required.

## Features

- **Dashboard** — win rate, total P&L, profit factor, expectancy, streaks, weekly/monthly performance
- **Calendar** — daily P&L cards with win/loss dots, weekly breakdown bars, monthly summary
- **Trades** — searchable, filterable, sortable trade log
- **Statistics** — 6+ charts: monthly P&L, win/loss distribution, win rate by setup/session, R:R distribution, P&L by quality grade
- **Playbook** — document your trading setups with entry rules and sample screenshots
- **Settings** — manage assets, setups, sessions, confirmations, POIs, rule checklist, and mistake types
- **Dark / Light mode** toggle
- **Trade quality grading** (A+/A/B/C), rule checklist with "Plan Followed" tracking, mistake tagging
- **Before/after screenshot comparison slider**
- **Export/Import** full journal as JSON

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Dexie.js (IndexedDB wrapper) — Repository pattern, swappable for a real backend later
- Zustand (state management)
- Chart.js (statistics charts)

## Getting Started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

## Project Structure

```
src/
  types/        TypeScript interfaces (Trade, PlaybookEntry, AppSettings)
  db/           Dexie database + Repository layer (TradeRepo, PlaybookRepo, SettingsRepo)
  store/        Zustand global store
  components/
    layout/     Sidebar
    modals/     TradeModal, TradeDetailModal, PlaybookModal
    ui/         Badges, ImageUpload, CompareSlider, Lightbox, Toast, ConfirmDialog
  pages/        Dashboard, Calendar, Trades, Statistics, Playbook, Settings
  hooks/        useToast, useConfirm
  utils/        formatting & stats calculation helpers
```

## Data & Backend Migration

All storage operations go through the Repository layer in `src/db/index.ts`. To migrate to Supabase, Firebase, or a REST API later, you only need to replace the implementations of `TradeRepo`, `PlaybookRepo`, and `SettingsRepo` — no UI changes required.

## Keyboard Shortcuts

- `Ctrl/Cmd + N` — Log a new trade
- `Esc` — Close any open modal

## License

Personal use project.
