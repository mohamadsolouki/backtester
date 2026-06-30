# Trade OS

Internal operating system for discretionary trading: opportunity tracking, context grading, E1/E2/E3 entry planning, trade journaling, routine/playbook discipline, edge analytics, reports, and CSV/XLSX import-export.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4
- Prisma 7 + PostgreSQL
- NextAuth credentials auth skeleton
- Recharts visualizations
- CSV/XLSX import-export with Papa Parse and SheetJS

## Local Development

```bash
npm install
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000`.

The current UI ships with realistic demo data so the platform is usable before a production database is connected.

Current Vercel deployment:

```text
https://backtester-teal.vercel.app
```

## Intended User Journey

1. Start in `Overview` to check the daily plan, risk rules, routine completion, and next action.
2. Use `Watchlist` to create or import ideas before they become trades.
3. Use the Context Engine tab on an opportunity to tag independent confirmations and let the app auto-count confirmations and auto-grade the opportunity.
4. Use `Playbook` to compare the setup against valid/invalid conditions and set E1/E2/E3 entry states.
5. Return to `Watchlist` to mark the decision as Taken, Skipped, or Not Formed.
6. Use `Journal` to review execution quality and capture the lesson.
7. Use `Analytics`, `Edge Lab`, and `Reports` to review win rate, expectancy, context quality, session quality, and rule breaks.
8. Use `Settings` to tune risk limits and import mappings.

The dashboard workflow rail mirrors this path so the user always has a clear next step.

## Environment

Create `.env` from `.env.example`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

For production on Vercel, set `NEXTAUTH_URL` to the deployed URL.

## Database

Generate the Prisma client:

```bash
npm run prisma:generate
```

Create and apply a migration after connecting a real Postgres database:

```bash
npm run prisma:migrate
```

Production deploy migration:

```bash
npm run prisma:deploy
```

## Vercel Deployment

1. Push this repo to GitHub.
2. Create a free Vercel project from the repo.
3. Add a free Postgres provider from the Vercel marketplace, such as Neon.
4. Copy the provider `DATABASE_URL` into Vercel environment variables.
5. Add `NEXTAUTH_SECRET` and `NEXTAUTH_URL`.
6. Set the build command to `npm run build`.
7. Deploy.

The app is ready for Vercel Hobby hosting. PostgreSQL should be provided by Neon, Supabase, or another Vercel marketplace Postgres provider.
