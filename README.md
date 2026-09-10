# Flonion Desk

Internal operations console for the [Flonion](https://flonion.com) platform -- an admin dashboard for monitoring businesses, users, reviews, and AI usage across every customer.

## Overview

Flonion Desk is a single-page admin console built with React Router (SSR), backed by a PostgreSQL database via Prisma Next. It pulls aggregated metrics from the Flonion production database and renders them in a responsive dashboard with stat tiles, charts, tables, and an activity feed.

Currently only the **Overview** route is implemented. The sidebar includes placeholder entries for Businesses, Users, Reviews, AI Usage, Marketplace, Meetings, and account sections -- these mark where the console is headed.

## Features

- **Stat tiles** -- Businesses onboarded, verified users, reviews collected, AI generations with month-over-month deltas
- **Platform health panel** -- QR scans, Google connections, 2FA adoption
- **Signups & reviews charts** -- 8-week rolling bucketed series via Recharts
- **Recent businesses table** -- Latest 6 onboarded businesses with rating, sector, and onboarding status
- **Activity feed** -- Merged stream of join requests, invitations, and feedback
- **Responsive layout** -- Fixed sidebar on `lg+`, swipe-dismissable drawer on smaller screens
- **Graceful error handling** -- Database outages degrade to an error panel instead of crashing the UI

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React Router 8 (SSR enabled) |
| UI | React 19, Base UI, Lucide React icons |
| Styling | Tailwind CSS 4, custom design tokens |
| Charts | Recharts |
| Database | PostgreSQL 15+ (Neon serverless) |
| ORM | Prisma Next (`@prisma/orm-postgres`) |
| Linting | Biome |
| Build | Vite 8 |
| Fonts | Jost (body), Rubik (headings) via `@fontsource-variable` |
| Language | TypeScript (strict mode) |

## Requirements

- Node.js 24+ (Alpine image used in Docker)
- PostgreSQL 15 or newer
- A `DATABASE_URL` pointing to your Postgres instance

## Installation

```bash
git clone git@github.com:Digital-Covet/flonion-desk.git
cd flonion-desk
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?sslmode=require"
```

The connection string is read by `prisma.config.ts` (CLI) and `app/prisma/db.ts` (runtime). Neon pooled and unpooled URLs both work.

## Usage

### Development

```bash
npm run dev
```

Starts the Vite dev server with HMR at `http://localhost:5173`.

### Production build

```bash
npm run build
npm run start
```

`start` runs the built-in `react-router-serve` server from `build/server/index.js`.

### Docker

```bash
docker build -t flonion-desk .
docker run -p 3000:3000 flonion-desk
```

### Database management

```bash
npx prisma contract emit   # Regenerate contract.json and contract.d.ts
npx prisma db init          # Create tables from the contract
npx prisma migration status # Check migration state
```

## Project Structure

```
flonion-desk/
  app/
    components/
      dashboard/        # Dashboard panels (charts, tables, stat cards, feed)
      sidebar/          # Navigation rail and mobile drawer
      ui/               # Shared widgets (tooltip, progress bar, hint)
      data/             # Static config (nav links, stat tile defs, footer)
      constants.ts      # Design tokens (colors, shadows, typography)
      types.ts          # Shared TypeScript interfaces
      Dashboard.tsx     # Main dashboard layout
      Sidebar.tsx       # Sidebar shell (desktop + drawer)
    prisma/
      contract.prisma   # Data contract (20+ models)
      db.ts             # Database client
      overview.ts       # Server-side queries for the overview route
    routes/
      home.tsx          # Overview route (loader + component)
    routes.ts           # Route config
    root.tsx            # App shell (HTML, error boundary)
    app.css             # Tailwind imports, font tokens, Base UI styles
  public/               # Static assets (favicon)
  prisma.config.ts      # Prisma CLI configuration
  react-router.config.ts
  vite.config.ts
  tsconfig.json
  biome.json
  Dockerfile
```

## Data Contract

The Prisma Next contract at `app/prisma/contract.prisma` defines the full schema. Key models include:

- **Business** -- Businesses with ratings, reviews, scheduling config, services, projects
- **User** -- Accounts with 2FA, onboarding state, role-based access
- **SharedReview / ReviewAnalytics** -- Customer reviews with AI copy generation tracking
- **MeetingRequest / AvailabilitySlot** -- Booking system
- **Task** -- Kanban-style task tracking per business
- **Invitation / JoinRequest** -- Team management workflows

After editing `contract.prisma`, run:

```bash
npx prisma contract emit
```

This regenerates `contract.json` and `contract.d.ts` which power the typed ORM client.

## Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run typecheck` | Run `react-router typegen` then `tsc` |
| `npm run lint` | Biome lint with auto-fix |
| `npm run check` | Biome check (lint + format) with auto-fix |
| `npm run contract:emit` | Regenerate Prisma contract files |

## License

No license file found. Contact [Digital-Covet](https://github.com/Digital-Covet) for usage terms.
