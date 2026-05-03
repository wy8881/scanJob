# ScanJob Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js analytics dashboard at `dashboard/` that reads from a new `GET /stats` endpoint on the existing scanJob Railway backend, deployed to Vercel.

**Architecture:** Backend gets one new endpoint (`GET /stats`) that runs PostgreSQL GROUP BY queries and returns aggregated data. Frontend is a standalone Next.js app in `dashboard/` — single page, fetches stats on load and on time range change, all chart interactivity is browser-side with no further API calls.

**Tech Stack:** Bun + Elysia (backend addition), Next.js 15, Recharts, Tailwind CSS (frontend), Vercel (deployment)

---

## File Map

```
scanJob/                              ← existing repo root
├── src/
│   ├── index.ts                      ← MODIFY: register statsRoutes
│   ├── db/
│   │   └── stats.ts                  ← CREATE: SQL queries for /stats
│   └── api/
│       └── stats.ts                  ← CREATE: GET /stats handler
├── tests/
│   └── api/
│       └── stats.test.ts             ← CREATE: endpoint tests
│
└── dashboard/                        ← CREATE: new Next.js app (its own package.json)
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    ├── .env.local                    ← NEXT_PUBLIC_API_URL=https://your-railway-url
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx                  ← dashboard page, wires all components
    ├── components/
    │   ├── Header.tsx                ← title + time range buttons
    │   ├── StatCard.tsx              ← stat card with optional top-5 popover
    │   ├── JobsPostedChart.tsx       ← cumulative line chart
    │   ├── LevelChart.tsx            ← donut chart
    │   └── TechChart.tsx             ← horizontal bar chart
    └── lib/
        ├── api.ts                    ← fetchStats(from, to) → StatsResponse
        ├── transforms.ts             ← computeCumulative, getDateRange, getEnabledRanges
        ├── transforms.test.ts        ← tests for pure transform functions
        └── types.ts                  ← StatsResponse, TimeRange types
```

---

## Part 1: Backend

### Task 1: Stats DB queries

**Files:**
- Create: `src/db/stats.ts`

- [ ] **Step 1: Create `src/db/stats.ts`**

```typescript
import { sql } from './client'

export interface StatsResult {
  meta: { totalJobs: number; earliestJobDate: string | null }
  byCategory: { category: string; count: number }[]
  byLevel: { level: string; count: number }[]
  byTech: { tech: string; count: number }[]
  byCompany: { company: string; count: number }[]
  byDay: { date: string; count: number }[]
}

export async function queryStats(from: Date, to: Date): Promise<StatsResult> {
  const [meta, byCategory, byLevel, byTech, byCompany, byDay] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS "totalJobs", MIN(posted_at)::text AS "earliestJobDate"
      FROM jobs
      WHERE posted_at >= ${from} AND posted_at <= ${to}
    `,
    sql`
      SELECT category, COUNT(*)::int AS count
      FROM jobs
      WHERE posted_at >= ${from} AND posted_at <= ${to} AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC
    `,
    sql`
      SELECT level, COUNT(*)::int AS count
      FROM jobs
      WHERE posted_at >= ${from} AND posted_at <= ${to} AND level IS NOT NULL
      GROUP BY level ORDER BY count DESC
    `,
    sql`
      SELECT t.name AS tech, COUNT(*)::int AS count
      FROM job_technologies jt
      JOIN technologies t ON t.id = jt.tech_id
      JOIN jobs j ON j.id = jt.job_id
      WHERE j.posted_at >= ${from} AND j.posted_at <= ${to}
      GROUP BY t.name ORDER BY count DESC LIMIT 10
    `,
    sql`
      SELECT company, COUNT(*)::int AS count
      FROM jobs
      WHERE posted_at >= ${from} AND posted_at <= ${to} AND company IS NOT NULL
      GROUP BY company ORDER BY count DESC LIMIT 10
    `,
    sql`
      SELECT DATE(posted_at)::text AS date, COUNT(*)::int AS count
      FROM jobs
      WHERE posted_at >= ${from} AND posted_at <= ${to}
      GROUP BY DATE(posted_at) ORDER BY date ASC
    `,
  ])

  return {
    meta: {
      totalJobs: meta[0]?.totalJobs ?? 0,
      earliestJobDate: meta[0]?.earliestJobDate ?? null,
    },
    byCategory: byCategory as { category: string; count: number }[],
    byLevel: byLevel as { level: string; count: number }[],
    byTech: byTech as { tech: string; count: number }[],
    byCompany: byCompany as { company: string; count: number }[],
    byDay: byDay as { date: string; count: number }[],
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db/stats.ts
git commit -m "feat: add queryStats DB function"
```

---

### Task 2: `GET /stats` endpoint + CORS

**Files:**
- Create: `src/api/stats.ts`
- Modify: `src/index.ts` — add statsRoutes and CORS plugin

- [ ] **Step 1: Install CORS plugin**

```bash
bun add @elysiajs/cors
```

- [ ] **Step 2: Create `src/api/stats.ts`**

```typescript
import Elysia, { t } from 'elysia'
import { queryStats } from '../db/stats'

export const statsRoutes = new Elysia().get(
  '/stats',
  async ({ query, error }) => {
    const from = query.from
      ? new Date(query.from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const to = query.to ? new Date(query.to) : new Date()

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return error(400, { error: 'Invalid date. Use ISO format: YYYY-MM-DD' })
    }

    return queryStats(from, to)
  },
  {
    query: t.Object({
      from: t.Optional(t.String()),
      to: t.Optional(t.String()),
    }),
  }
)
```

- [ ] **Step 3: Register statsRoutes and CORS in `src/index.ts`**

Open `src/index.ts`. At the top, add these imports alongside the existing ones:

```typescript
import { cors } from '@elysiajs/cors'
import { statsRoutes } from './api/stats'
```

Then add `.use(cors()).use(statsRoutes)` to the Elysia app chain, following the same pattern as the existing routes (`.use(jobsRoutes)`, etc.).

- [ ] **Step 4: Smoke test — start the server and hit the endpoint**

```bash
bun run src/index.ts
```

In a second terminal:

```bash
curl "http://localhost:3000/stats" | head -c 200
```

Expected: JSON with `meta`, `byCategory`, `byLevel`, `byTech`, `byCompany`, `byDay` keys.

- [ ] **Step 5: Commit**

```bash
git add src/api/stats.ts src/index.ts
git commit -m "feat: add GET /stats endpoint with CORS"
```

---

### Task 3: Tests for `GET /stats`

**Files:**
- Create: `tests/api/stats.test.ts`

- [ ] **Step 1: Create `tests/api/stats.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import { app } from '../../src/index'

describe('GET /stats', () => {
  it('returns all required keys', async () => {
    const res = await app.handle(new Request('http://localhost/stats'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('meta')
    expect(body).toHaveProperty('byCategory')
    expect(body).toHaveProperty('byLevel')
    expect(body).toHaveProperty('byTech')
    expect(body).toHaveProperty('byCompany')
    expect(body).toHaveProperty('byDay')
    expect(typeof body.meta.totalJobs).toBe('number')
  })

  it('accepts from and to query params', async () => {
    const res = await app.handle(
      new Request('http://localhost/stats?from=2026-01-01&to=2026-12-31')
    )
    expect(res.status).toBe(200)
  })

  it('returns 400 for invalid date', async () => {
    const res = await app.handle(
      new Request('http://localhost/stats?from=not-a-date')
    )
    expect(res.status).toBe(400)
  })
})
```

Note: the tests call `app.handle(...)` directly. For this to work, `app` must be exported from `src/index.ts`. Open that file and check — the Elysia instance should be declared as `export const app = new Elysia()...`. If it says `const app` without `export`, add the `export` keyword. The server start call (`app.listen(...)`) stays as-is.

- [ ] **Step 2: Run the tests**

```bash
bun test tests/api/stats.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/api/stats.test.ts
git commit -m "test: add tests for GET /stats"
```

---

## Part 2: Frontend

### Task 4: Scaffold Next.js app

**Files:**
- Create: `dashboard/` (entire Next.js scaffold)

- [ ] **Step 1: Scaffold from the repo root**

```bash
cd /Users/yi/code/scanJob
npx create-next-app@latest dashboard --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```

Expected: creates `dashboard/` with Next.js 15, TypeScript, Tailwind CSS, ESLint, App Router all configured.

- [ ] **Step 2: Install Recharts**

```bash
cd dashboard
npm install recharts
```

- [ ] **Step 3: Create `dashboard/.env.local`**

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

(Replace with your Railway URL when deploying.)

- [ ] **Step 4: Start dev server to verify scaffold works**

```bash
npm run dev
```

Open http://localhost:3001 (Next.js picks 3001 if 3000 is taken by the backend).
Expected: default Next.js welcome page.

- [ ] **Step 5: Clear the default page — replace `dashboard/app/page.tsx`**

```tsx
export default function Page() {
  return <main className="p-8 text-gray-900">Dashboard coming soon</main>
}
```

- [ ] **Step 6: Commit**

```bash
cd ..
git add dashboard/
git commit -m "feat: scaffold Next.js dashboard app"
```

---

### Task 5: Types and API client

**Files:**
- Create: `dashboard/lib/types.ts`
- Create: `dashboard/lib/api.ts`

- [ ] **Step 1: Create `dashboard/lib/types.ts`**

```typescript
export interface StatsResponse {
  meta: {
    totalJobs: number
    earliestJobDate: string | null
  }
  byCategory: { category: string; count: number }[]
  byLevel: { level: string; count: number }[]
  byTech: { tech: string; count: number }[]
  byCompany: { company: string; count: number }[]
  byDay: { date: string; count: number }[]
}

export type TimeRange = 'month' | '3months' | '6months' | 'year'
```

- [ ] **Step 2: Create `dashboard/lib/api.ts`**

```typescript
import type { StatsResponse } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function fetchStats(from: Date, to: Date): Promise<StatsResponse> {
  const params = new URLSearchParams({
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  })
  const res = await fetch(`${API_URL}/stats?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`)
  return res.json()
}
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/lib/
git commit -m "feat: add StatsResponse types and fetchStats API client"
```

---

### Task 6: Data transforms with tests

**Files:**
- Create: `dashboard/lib/transforms.ts`
- Create: `dashboard/lib/transforms.test.ts`

- [ ] **Step 1: Write the failing tests first — create `dashboard/lib/transforms.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import { computeCumulative, getDateRange, getEnabledRanges } from './transforms'

describe('computeCumulative', () => {
  it('returns running total', () => {
    const input = [
      { date: '2026-05-01', count: 10 },
      { date: '2026-05-02', count: 5 },
      { date: '2026-05-03', count: 8 },
    ]
    const result = computeCumulative(input)
    expect(result).toEqual([
      { date: '2026-05-01', count: 10 },
      { date: '2026-05-02', count: 15 },
      { date: '2026-05-03', count: 23 },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(computeCumulative([])).toEqual([])
  })
})

describe('getEnabledRanges', () => {
  it('only enables month when no data', () => {
    const result = getEnabledRanges(null)
    expect(result.month).toBe(true)
    expect(result['3months']).toBe(false)
    expect(result['6months']).toBe(false)
    expect(result.year).toBe(false)
  })

  it('enables 3months when earliest date is 3+ months ago', () => {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 4)
    const result = getEnabledRanges(threeMonthsAgo.toISOString().split('T')[0])
    expect(result['3months']).toBe(true)
    expect(result['6months']).toBe(false)
  })
})

describe('getDateRange', () => {
  it('month range starts on the 1st of this month', () => {
    const { from } = getDateRange('month')
    expect(from.getDate()).toBe(1)
    expect(from.getMonth()).toBe(new Date().getMonth())
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun test dashboard/lib/transforms.test.ts 2>&1 | head -20
```

Expected: error — `transforms` module not found.

- [ ] **Step 3: Create `dashboard/lib/transforms.ts`**

```typescript
import type { TimeRange } from './types'

export function computeCumulative(
  byDay: { date: string; count: number }[]
): { date: string; count: number }[] {
  let running = 0
  return byDay.map(({ date, count }) => {
    running += count
    return { date, count: running }
  })
}

export function getDateRange(range: TimeRange): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()
  if (range === 'month') {
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
  } else if (range === '3months') {
    from.setMonth(from.getMonth() - 3)
    from.setHours(0, 0, 0, 0)
  } else if (range === '6months') {
    from.setMonth(from.getMonth() - 6)
    from.setHours(0, 0, 0, 0)
  } else {
    // year: Jan 1 of current year
    from.setMonth(0)
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
  }
  return { from, to }
}

export function getEnabledRanges(
  earliestJobDate: string | null
): Record<TimeRange, boolean> {
  if (!earliestJobDate) {
    return { month: true, '3months': false, '6months': false, year: false }
  }
  const earliest = new Date(earliestJobDate)
  const now = new Date()
  const monthsAgo =
    (now.getFullYear() - earliest.getFullYear()) * 12 +
    (now.getMonth() - earliest.getMonth())
  return {
    month: true,
    '3months': monthsAgo >= 3,
    '6months': monthsAgo >= 6,
    year: monthsAgo >= 2,
  }
}
```

- [ ] **Step 4: Run the tests with Bun**

```bash
bun test dashboard/lib/transforms.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add dashboard/lib/transforms.ts dashboard/lib/transforms.test.ts
git commit -m "feat: add data transforms with tests"
```

---

### Task 7: Header component

**Files:**
- Create: `dashboard/components/Header.tsx`

- [ ] **Step 1: Create `dashboard/components/Header.tsx`**

```tsx
'use client'

import type { TimeRange } from '../lib/types'

interface HeaderProps {
  activeRange: TimeRange
  enabledRanges: Record<TimeRange, boolean>
  onRangeChange: (range: TimeRange) => void
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: '3months', label: '3 months' },
  { value: '6months', label: '6 months' },
  { value: 'year', label: 'This year' },
]

export function Header({ activeRange, enabledRanges, onRangeChange }: HeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Scan<span className="text-indigo-500">Job</span>
        </h1>
        <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
          Australian IT Job Market Trends
        </p>
      </div>
      <div className="flex gap-2">
        {RANGES.map(({ value, label }) => {
          const enabled = enabledRanges[value]
          const active = activeRange === value
          return (
            <button
              key={value}
              disabled={!enabled}
              onClick={() => enabled && onRangeChange(value)}
              className={[
                'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                active
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : enabled
                    ? 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 cursor-pointer'
                    : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/components/Header.tsx
git commit -m "feat: add Header component"
```

---

### Task 8: StatCard component

**Files:**
- Create: `dashboard/components/StatCard.tsx`

- [ ] **Step 1: Create `dashboard/components/StatCard.tsx`**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  topFive?: { name: string; count: number }[]
}

export function StatCard({ label, value, sub, topFive }: StatCardProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      ref={ref}
      onClick={() => topFive && setOpen((o) => !o)}
      className={[
        'relative bg-white rounded-xl p-3.5 border select-none',
        topFive ? 'cursor-pointer' : '',
        open
          ? 'border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
          : 'border-gray-200',
      ].join(' ')}
    >
      <div className="flex justify-between items-start">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        {topFive && (
          <span className="text-[10px] text-gray-400">{open ? '▲' : '▼'} top 5</span>
        )}
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}

      {open && topFive && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-10 p-3">
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Top 5
          </p>
          <div className="flex flex-col gap-1.5">
            {topFive.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold w-4 ${
                    i === 0 ? 'text-indigo-500' : 'text-gray-400'
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`flex-1 text-xs truncate ${
                    i === 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'
                  }`}
                >
                  {item.name}
                </span>
                <span className="text-xs text-gray-500">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/components/StatCard.tsx
git commit -m "feat: add StatCard component with top-5 popover"
```

---

### Task 9: JobsPostedChart component

**Files:**
- Create: `dashboard/components/JobsPostedChart.tsx`

- [ ] **Step 1: Create `dashboard/components/JobsPostedChart.tsx`**

```tsx
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

interface JobsPostedChartProps {
  data: { date: string; count: number }[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`
}

export function JobsPostedChart({ data }: JobsPostedChartProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 mb-3">
      <p className="text-sm font-semibold text-gray-900 mb-1">Jobs Posted</p>
      <p className="text-[11px] text-gray-400 mb-4">
        Cumulative total jobs posted — hover a point to see exact count
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            label={{
              value: '↑ Cumulative jobs posted',
              angle: -90,
              position: 'insideLeft',
              offset: 14,
              style: { fontSize: 9, fill: '#9ca3af' },
            }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
            formatter={(value: number) => [value, 'Total jobs']}
            labelFormatter={formatDate}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/components/JobsPostedChart.tsx
git commit -m "feat: add JobsPostedChart cumulative line chart"
```

---

### Task 10: LevelChart component

**Files:**
- Create: `dashboard/components/LevelChart.tsx`

- [ ] **Step 1: Create `dashboard/components/LevelChart.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f87171']

interface LevelChartProps {
  data: { level: string; count: number }[]
}

export function LevelChart({ data }: LevelChartProps) {
  const [activeLevel, setActiveLevel] = useState<string | null>(null)

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const active = activeLevel ? data.find((d) => d.level === activeLevel) : null

  function handleClick(level: string) {
    setActiveLevel((prev) => (prev === level ? null : level))
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <p className="text-sm font-semibold text-gray-900 mb-1">Jobs by Level</p>
      <p className="text-[11px] text-gray-400 mb-4">Click a segment to highlight</p>
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-[120px] h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={52}
                dataKey="count"
                onClick={(entry) => handleClick(entry.level)}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={entry.level}
                    fill={COLORS[i % COLORS.length]}
                    opacity={activeLevel && activeLevel !== entry.level ? 0.3 : 1}
                    cursor="pointer"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Centre label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs font-bold text-gray-900 capitalize">
              {active?.level ?? 'All'}
            </span>
            <span className="text-[10px] text-gray-500">
              {active
                ? `${Math.round((active.count / total) * 100)}%`
                : total}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {data.map((entry, i) => (
            <button
              key={entry.level}
              onClick={() => handleClick(entry.level)}
              className="flex items-center gap-1.5 text-[11px]"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span
                className={
                  activeLevel === entry.level
                    ? 'font-semibold text-gray-900'
                    : 'text-gray-500'
                }
              >
                {entry.level} {Math.round((entry.count / total) * 100)}%
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/components/LevelChart.tsx
git commit -m "feat: add LevelChart donut component"
```

---

### Task 11: TechChart component

**Files:**
- Create: `dashboard/components/TechChart.tsx`

- [ ] **Step 1: Create `dashboard/components/TechChart.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

interface TechChartProps {
  data: { tech: string; count: number }[]
}

export function TechChart({ data }: TechChartProps) {
  const [activeTech, setActiveTech] = useState<string | null>(null)

  function handleClick(tech: string) {
    setActiveTech((prev) => (prev === tech ? null : tech))
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <p className="text-sm font-semibold text-gray-900 mb-1">Top Technologies</p>
      <p className="text-[11px] text-gray-400 mb-4">Click a bar to highlight</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="tech"
            tick={{ fontSize: 11, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
            formatter={(value: number) => [value, 'listings']}
          />
          <Bar
            dataKey="count"
            radius={[0, 3, 3, 0]}
            onClick={(entry) => handleClick(entry.tech)}
            cursor="pointer"
          >
            {data.map((entry) => (
              <Cell
                key={entry.tech}
                fill="#6366f1"
                opacity={activeTech && activeTech !== entry.tech ? 0.3 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/components/TechChart.tsx
git commit -m "feat: add TechChart horizontal bar component"
```

---

### Task 12: Wire up the dashboard page

**Files:**
- Modify: `dashboard/app/page.tsx`
- Modify: `dashboard/app/globals.css`
- Modify: `dashboard/app/layout.tsx`

- [ ] **Step 1: Update `dashboard/app/globals.css`**

Replace the entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Update `dashboard/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ScanJob — Australian IT Job Market',
  description: 'Analytics dashboard for Australian IT job market trends',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Replace `dashboard/app/page.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { fetchStats } from '../lib/api'
import { computeCumulative, getDateRange, getEnabledRanges } from '../lib/transforms'
import { Header } from '../components/Header'
import { StatCard } from '../components/StatCard'
import { JobsPostedChart } from '../components/JobsPostedChart'
import { LevelChart } from '../components/LevelChart'
import { TechChart } from '../components/TechChart'
import type { StatsResponse, TimeRange } from '../lib/types'

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>('month')
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { from, to } = getDateRange(range)
    setLoading(true)
    setError(null)
    fetchStats(from, to)
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [range])

  const enabledRanges = getEnabledRanges(stats?.meta.earliestJobDate ?? null)
  const cumulativeData = stats ? computeCumulative(stats.byDay) : []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    )
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 text-sm">
        {error}
      </div>
    )
  }
  if (!stats) return null

  const topCategory = stats.byCategory[0]
  const topTech = stats.byTech[0]
  const topLevel = stats.byLevel[0]
  const topCompany = stats.byCompany[0]

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Header
          activeRange={range}
          enabledRanges={enabledRanges}
          onRangeChange={setRange}
        />

        <div className="grid grid-cols-5 gap-2.5 mb-5">
          <StatCard label="Total Jobs" value={stats.meta.totalJobs} />
          <StatCard
            label="Top Category"
            value={topCategory?.category ?? '—'}
            sub={topCategory ? `${topCategory.count} listings` : undefined}
            topFive={stats.byCategory.slice(0, 5).map((d) => ({
              name: d.category,
              count: d.count,
            }))}
          />
          <StatCard
            label="Top Tech"
            value={topTech?.tech ?? '—'}
            sub={topTech ? `in ${topTech.count} listings` : undefined}
            topFive={stats.byTech.slice(0, 5).map((d) => ({
              name: d.tech,
              count: d.count,
            }))}
          />
          <StatCard
            label="Common Level"
            value={topLevel?.level ?? '—'}
            sub={
              topLevel && stats.meta.totalJobs > 0
                ? `${Math.round((topLevel.count / stats.meta.totalJobs) * 100)}% of listings`
                : undefined
            }
            topFive={stats.byLevel.slice(0, 5).map((d) => ({
              name: d.level,
              count: d.count,
            }))}
          />
          <StatCard
            label="Top Hiring Co."
            value={topCompany?.company ?? '—'}
            sub={topCompany ? `${topCompany.count} listings` : undefined}
            topFive={stats.byCompany.slice(0, 5).map((d) => ({
              name: d.company,
              count: d.count,
            }))}
          />
        </div>

        <JobsPostedChart data={cumulativeData} />

        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
          <LevelChart data={stats.byLevel} />
          <TechChart data={stats.byTech} />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run dev server with the backend also running, verify the full dashboard loads**

Terminal 1 (backend):
```bash
cd /Users/yi/code/scanJob
bun run src/index.ts
```

Terminal 2 (frontend):
```bash
cd /Users/yi/code/scanJob/dashboard
npm run dev
```

Open http://localhost:3001 — expected: full dashboard with stat cards and charts populated from the API.

- [ ] **Step 5: Commit**

```bash
cd ..
git add dashboard/app/
git commit -m "feat: wire up dashboard page with all components"
```

---

### Task 13: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Create a new Vercel project**

Go to https://vercel.com/new → Import your `scanJob` GitHub repo.

- [ ] **Step 3: Configure the Vercel project**

In the Vercel project settings:
- **Root Directory:** `dashboard`
- **Framework Preset:** Next.js (auto-detected)

- [ ] **Step 4: Add environment variable**

In Vercel → Settings → Environment Variables:
- Key: `NEXT_PUBLIC_API_URL`
- Value: your Railway backend URL (e.g. `https://scanjob.up.railway.app`)

- [ ] **Step 5: Deploy**

Click Deploy. Vercel builds from the `dashboard/` subdirectory.

Expected: dashboard live at `https://scanjob-dashboard.vercel.app` (or similar).

- [ ] **Step 6: Verify the live dashboard loads data**

Open the Vercel URL. All 5 stat cards and 3 charts should populate.

If you see CORS errors in the browser console: double-check that `@elysiajs/cors` is installed and `.use(cors())` is in the backend's Elysia chain.
