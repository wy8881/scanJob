# scanJob

Scrapes IT job listings from Seek and LinkedIn, enriches them with level/category/tech metadata, and serves results via a REST API. Includes a Next.js dashboard for visualising trends.

## Stack

- **Backend:** Bun, Elysia, croner, Playwright (Seek), fetch + Cheerio (LinkedIn), postgres.js
- **Database:** PostgreSQL
- **Dashboard:** Next.js, Tailwind CSS, Recharts

## Setup

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- PostgreSQL running locally

### Backend

```bash
# Install dependencies
bun install

# Copy and fill in environment variables
cp .env.example .env

# Create the database, then run migrations
createdb scanjob
bun run migrate

# Start the server (also triggers an initial scrape)
bun run start
```

The server runs on `http://localhost:3000` by default.

### Dashboard

```bash
cd dashboard
npm install
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Job stats broken down by level, category, tech, company, and day |

Query params for `/stats`: `from` and `to` (ISO date strings, e.g. `2026-01-01`). Defaults to the current month.

## Tests

```bash
bun test
```
