# ScanJob Dashboard — Design Spec
**Date:** 2026-05-03

## Overview

A standalone analytics dashboard that visualises Australian IT job market trends from the scanJob scraper. Deployed to Vercel, reads from the existing Railway backend via a new `GET /stats` endpoint.

Personal use only. Not a portfolio piece.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (standalone app, separate from portfolio site) |
| Chart library | Recharts |
| Deployment | Vercel (free tier) |
| Data source | scanJob Railway API — new `GET /stats` endpoint |

---

## Architecture

```
Browser
  └── Next.js dashboard (Vercel)
        └── GET /stats?from=<date>   ← Railway API (existing backend)
              └── PostgreSQL GROUP BY queries
```

- The dashboard has no backend of its own — it is a pure frontend that reads from the existing scanJob API.
- A single `GET /stats` call is made on page load (and on time range change). All chart rendering and interactivity after that happens in the browser with no further API calls.
- The Railway backend adds one new endpoint: `GET /stats`. No other backend changes are needed.

---

## Pages & Routing

Single page: `/` (the dashboard). No other routes.

---

## Time Range Selector

Four buttons in the top-right of the header:

| Button | State | Notes |
|---|---|---|
| This month | **Active** | Default selection |
| 3 months | Disabled | Enabled once 3 months of data exists |
| 6 months | Disabled | Enabled once 6 months of data exists |
| This year | Disabled | Enabled once 1 year of data exists |

Changing the active time range triggers a new `GET /stats` call and re-renders all charts.

"Year vs Year" comparison is a future feature — not in scope for this build.

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  ScanJob                    [This month] [3mo] [6mo] [yr]│
│  Australian IT Job Market Trends                         │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│Total Jobs│Top Cat.  │Top Tech  │Common Lvl│Top Hiring Co│
│  178     │Software  │ React    │  Mid     │ Atlassian   │
│ ↑12%     │Eng  ▼top5│ 64  ▼top5│ 42% ▼top5│ 14  ▲top5  │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                                                          │
│  Jobs Posted (cumulative line chart, full width)         │
│                                                          │
├──────────────────────────┬──────────────────────────────┤
│  Jobs by Level (donut)   │  Top Technologies (bars)     │
└──────────────────────────┴──────────────────────────────┘
```

---

## Components

### Header
- Name: **"Scan`Job`"** — "Scan" in black, "Job" in indigo (`#6366f1`)
- Subtitle: "Australian IT Job Market Trends" in small uppercase grey
- Time range buttons top-right

### Stat Cards (5 columns)

Each card shows the #1 value for that dimension. Four of the five have a **clickable top-5 popover** (▼ top 5 hint in corner). Clicking opens a ranked list overlay.

| Card | Metric | Has top-5 popover |
|---|---|---|
| Total Jobs | Count + % change vs last period | No |
| Top Category | Name + listing count | Yes |
| Top Tech | Name + listing count | Yes |
| Common Level | Name + % of listings | Yes |
| Top Hiring Co. | Company name + listing count | Yes |

### Chart 1 — Jobs Posted (full width)
- Type: **Line chart** (Recharts `LineChart`)
- Y axis: cumulative total jobs posted (left side, labelled "↑ Cumulative jobs posted")
- X axis: dates within the selected time range
- Line: single indigo line, monotonically increasing
- Hover: vertical crosshair + tooltip showing exact date and cumulative count
- Subtle gradient fill under the line

### Chart 2 — Jobs by Level (bottom left)
- Type: **Donut chart** (Recharts `PieChart`)
- Segments: Graduate, Junior, Mid, Senior
- Centred in the card
- Active segment label + percentage shown in the donut hole
- Legend centred below the donut
- Click a segment to highlight it (others dim)

### Chart 3 — Top Technologies (bottom right)
- Type: **Horizontal bar chart** (Recharts `BarChart` with `layout="vertical"`)
- Shows top 10 technologies by listing count
- Click a bar to highlight it (others dim to 40% opacity)
- Selected bar gets a highlighted background card with a ✦ marker

---

## New Backend Endpoint: `GET /stats`

### Request
```
GET /stats?from=2026-05-01&to=2026-05-31
```

| Param | Type | Description |
|---|---|---|
| `from` | ISO date string | Start of range (inclusive) |
| `to` | ISO date string | End of range (inclusive). Defaults to today if omitted. |

### Response
```json
{
  "byCategory": [
    { "category": "software-engineer", "count": 58 }
  ],
  "byLevel": [
    { "level": "mid", "count": 75 }
  ],
  "byTech": [
    { "tech": "React", "count": 64 }
  ],
  "byCompany": [
    { "company": "Atlassian", "count": 14 }
  ],
  "byDay": [
    { "date": "2026-05-01", "count": 12 },
    { "date": "2026-05-02", "count": 8 }
  ]
}
```

- `byTech` and `byCompany` return top 10 results, ordered by count descending.
- `byDay` returns one row per day with new jobs posted that day. The frontend computes the cumulative sum.
- All queries use `posted_at` for date filtering.

### SQL patterns (to be implemented in the backend)

```sql
-- byCategory
SELECT category, COUNT(*) as count
FROM jobs
WHERE posted_at >= $from AND posted_at <= $to
GROUP BY category ORDER BY count DESC;

-- byTech
SELECT t.name as tech, COUNT(*) as count
FROM job_technologies jt
JOIN technologies t ON t.id = jt.tech_id
JOIN jobs j ON j.id = jt.job_id
WHERE j.posted_at >= $from AND j.posted_at <= $to
GROUP BY t.name ORDER BY count DESC LIMIT 10;

-- byDay
SELECT DATE(posted_at) as date, COUNT(*) as count
FROM jobs
WHERE posted_at >= $from AND posted_at <= $to
GROUP BY DATE(posted_at) ORDER BY date ASC;
```

---

## Data Flow

```
Page loads / time range changes
  → GET /stats?from=<date>&to=<date>
  → frontend computes:
      - cumulative sum from byDay   → Jobs Posted chart
      - top entry from byCategory   → Top Category card + popover
      - top entry from byTech       → Top Tech card + popover
      - top entry from byLevel      → Common Level card + popover
      - top entry from byCompany    → Top Hiring Co. card + popover
  → all charts render

User clicks a chart element
  → local state update only (no API call)
  → highlight/dim applied

User changes time range
  → new GET /stats call
  → all charts re-render
```

---

## Project Structure

```
scanjob-dashboard/          ← new standalone repo
├── app/
│   ├── layout.tsx          ← root layout, fonts
│   └── page.tsx            ← dashboard page (single route)
├── components/
│   ├── Header.tsx          ← ScanJob title + time range buttons
│   ├── StatCard.tsx        ← reusable stat card with optional top-5 popover
│   ├── JobsPostedChart.tsx ← cumulative line chart
│   ├── LevelChart.tsx      ← donut chart
│   └── TechChart.tsx       ← horizontal bar chart
├── lib/
│   ├── api.ts              ← fetchStats(from, to) → StatsResponse
│   └── transforms.ts       ← computeCumulative(byDay[]) → cumulative data
└── types.ts                ← StatsResponse type
```

---

## Interactivity

| Element | Interaction | Effect |
|---|---|---|
| Stat card with ▼ | Click | Opens top-5 popover. Click again or click outside to close. |
| Tech bar | Click | Highlights selected bar, dims all others to 40% opacity |
| Donut segment | Click | Highlights selected segment (others dim), updates centre label |
| Line chart point | Hover | Shows tooltip with date + exact cumulative count + vertical crosshair |
| Time range button | Click | Fetches new stats, re-renders all charts |

---

## Future Features (out of scope now)

- **3 months / 6 months / This year** time ranges — unlock automatically once sufficient data exists
- **Year vs Year** comparison — requires 2 full years of data, shows two overlapping lines
- **Category-over-time stacked area chart** — visualise how category mix shifts over months
