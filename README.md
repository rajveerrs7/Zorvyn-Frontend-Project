# Zorvyn Finance Dashboard

A modern finance dashboard built with Next.js. It combines summary metrics,
interactive charts, a rich transactions view, role-based UI controls, and a
clean responsive layout.

## Features

- Summary cards for total balance, income, and expenses
- Time-series trends for balance and cash flow
- Categorical spending breakdown
- Transactions list with search, sorting, and advanced filters
- Grouping toggles: none, month, or category
- Role switcher (Viewer vs Admin) with gated edit/add controls
- Insights panel (top category, monthly change, savings rate)
- Dark mode toggle
- Export to CSV/JSON
- Local persistence with Zustand
- MSW-backed mock API for formal data sync

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Zustand
- Recharts
- Framer Motion
- MSW

## Getting Started

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Mock API

MSW is enabled in `.env.local` and intercepts `/api/transactions`.
Use the "Sync mock API" button in the UI to refresh data via the stub.

## Project Structure

- `src/app/page.tsx` main dashboard UI
- `src/lib/finance-store.ts` state, filters, and actions
- `src/lib/finance-types.ts` shared types
- `src/mocks/` MSW handlers and mock data
- `src/app/globals.css` theme tokens and background styling
