# Trade OS — Master Plan

Goal: evolve Trade OS from a discretionary trading journal into a complete trading operating system that serves researchers and traders across MetaTrader (forex/CFD), TradingView, and crypto exchanges — covering the full loop: **plan → execute → record → analyze → improve**.

## Current State (audit, 2026-07-04)

Solid foundation:

- Next.js 16 + React 19 + Prisma 7/Postgres (Neon) + NextAuth, deployed on Vercel.
- Modules: Overview, Watchlist (opportunities), Playbook, Routine (SOP), Journal, Analytics, Edge Lab (context matrix), Reports, Import, Settings, Help.
- Context Engine with auto-grading, E1/E2/E3 entry planning, rule breaks, reviews.
- MetaTrader import (MT4 HTML, MT5 XML/XLSX, generic CSV) with dedup.
- i18n (8 locales, RTL), light/dark themes, demo seed data.

Gaps blocking "complete trade OS" status:

- **Single implicit account.** No concept of trading accounts/brokers; all trades in one bucket. Forex traders run multiple MT accounts, prop-firm challenges, and exchange accounts simultaneously.
- **Import is MetaTrader-only.** No TradingView, cTrader, Binance/Bybit or generic exchange support.
- **No live inbound integration.** TradingView alert webhooks are the de-facto standard for automation; nothing ingests them.
- **Analytics are shallow.** No drawdown curve, day/hour edge maps, per-symbol breakdown, streaks, calendar P&L, MAE/MFE.
- **No risk tooling.** No position-size calculator (pip/lot math), no prop-firm rule tracking (daily loss / max DD / profit target).
- **No stop/target on trades.** rMultiple is user-entered; can't verify planned vs. realized R.
- Backtest page is actually the Edge Lab (context matrix) — no real strategy backtesting on OHLC data.
- No market data, economic calendar, or notifications.

## Phases

### Phase 0 — Baseline hygiene
Commit pending working-tree changes; land this plan in the repo.

### Phase 1 — Multi-account foundation ✅ core of everything
- `TradingAccount` model: name, platform (MT4/MT5/cTrader/TradingView/Binance/Bybit/Other), base currency, starting balance, active flag.
- `Trade.accountId` (+ stopLoss/takeProfit fields for planned-R verification).
- Account CRUD in Settings, account column/filter in Journal, account picker on trade create/edit and import.
- Equity per account = starting balance + cumulative P&L.

### Phase 2 — Universal import hub
- TradingView export parser (strategy-tester "List of Trades" and paper-trading history).
- Binance Futures position-history and Bybit closed-P&L CSV parsers.
- Smarter generic CSV column auto-mapping; single auto-detect entry point.
- Import assigns trades to a chosen account; batch records the source platform.

### Phase 3 — TradingView webhook ingestion
- Per-user webhook token (regenerable in Settings).
- `POST /api/webhooks/tradingview` — alerts open/close trades or create watchlist opportunities.
- Copy-paste alert-message template in Settings.

### Phase 4 — Analytics 2.0
- Drawdown curve, profit factor/expectancy per account, win/loss streaks.
- Day-of-week × hour edge heatmap; per-symbol performance table; monthly P&L calendar.
- Planned-R vs realized-R when stop data exists.

### Phase 5 — Risk engine
- Forex position-size calculator: pip size/value per symbol class (majors, JPY pairs, metals, indices, crypto), lots from risk % + stop distance.
- Prop-firm rule tracker: account size, max daily loss, max total drawdown, profit target → live status vs. rules.
- Risk status surfaced on Overview.

### Phase 6 — Backtest Lab (real)
- OHLC CSV upload (any timeframe) into a `PriceSeries` store.
- Rule-based strategy definitions (EMA cross, breakout, session filter) run against series; results feed the same analytics components.
- Compare backtest vs. live edge for the same playbook setup.

### Phase 7 — Journal depth
- MAE/MFE per trade, hold-time analytics, tag-based filtering, calendar view of trading days, richer review workflow (weekly review wizard).

### Phase 8 — Reports & export
- One-click weekly/monthly report generation (PDF/CSV), prop-firm compliance report, shareable read-only report links.

### Phase 9 — Market context
- Economic calendar import (CSV/ICS adapters), news-window flags on trades, session clock for forex sessions (Sydney/Tokyo/London/NY).

### Phase 10 — Platform polish
- PWA/mobile layout audit, in-app notifications (risk breaches, routine reminders), public API tokens for researchers, exchange read-only API sync adapters.

## Sequencing rationale

Accounts (P1) unblock everything: imports need a destination, analytics need per-account equity, risk rules are account-scoped. Import breadth (P2) + webhooks (P3) capture data from all three trader groups. Analytics (P4) and risk (P5) turn that data into decisions. Backtesting (P6+) extends from journal-of-record to research platform.

Each phase ships independently and is committed to git on completion.
