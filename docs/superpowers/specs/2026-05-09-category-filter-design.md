# Category Filter for Dashboard

**Date:** 2026-05-09  
**Branch:** feature/dashboard

## Summary

Add a global category dropdown to the dashboard header. When a category is selected, all charts and stat cards re-fetch and display data scoped to that category. The "Top Category" stat card is always unfiltered (global) so it remains meaningful regardless of the active filter.

## Decisions Made

- **Filter style:** Compact dropdown (`<select>`) styled as a pill, inserted into the existing header right-side flex row (after Refresh, before time-range pills). No changes to existing header elements (fairy mascot, sparkle, logo, time-range pills).
- **Scope:** Global — affects all charts and stat cards except "Top Category".
- **Approach:** Server-side filter param (`?category=`) on the existing `/stats` endpoint. No new endpoint needed.
- **`byCategory` query:** Always runs unfiltered so "Top Category" always shows the most common category globally.
- **Data size concern:** Not an issue. All queries return aggregated rows (capped by `LIMIT`). Max ~12 KB even for year view. Re-fetching on category change is equivalent to re-fetching on time-range change, which already works.

## Categories

Sourced from `src/enrichment/keywords.ts`. Display labels mapped from slugs:

| Slug | Display label |
|------|---------------|
| (none) | All categories |
| `software-engineer` | Software Engineer |
| `backend-developer` | Backend |
| `web-development` | Web / Frontend |
| `data-analyst` | Data Analyst |
| `data-engineer` | Data Engineer |
| `ai-ml-engineer` | AI / ML |
| `it-support` | IT Support |
| `cyber-security` | Cyber Security |
| `qa-tester` | QA / Testing |
| `devops` | DevOps |
| `mobile-developer` | Mobile |
| `developer` | Developer |

## Architecture

### Backend

**`src/api/stats.ts`**
- Add optional `category` query param (string, default empty)
- Pass it through to `queryStats`

**`src/db/stats.ts`**
- `queryStats` signature: `(from: Date, to: Date, category?: string) => Promise<StatsResult>`
- Five queries (`meta`, `byLevel`, `byTech`, `byCompany`, `byDay`) add: `AND (${category} IS NULL OR j.category = ${category})` (or equivalent using the sql tagged template)
- `byCategory` query: unchanged — always returns global category counts

### Frontend

**`dashboard/lib/api.ts`**
- `fetchStats(from, to, category?)` — when `category` is provided and not `'all'`, append `&category=<value>` to URL params

**`dashboard/app/page.tsx`**
- New state: `const [category, setCategory] = useState('all')`
- Pass `category` to `fetchStats` in the `load` callback
- Pass `activeCategory={category}` and `onCategoryChange={setCategory}` to `<Header>`
- Re-fetch triggers: time range change OR category change (both already handled by the `load` callback)

**`dashboard/components/Header.tsx`**
- New props: `activeCategory: string`, `onCategoryChange: (c: string) => void`
- Add `<select>` into the existing right-side flex row, between Refresh button and time-range pills
- Style to match existing pill aesthetic (white background, `border-fairy-border`, rounded-full, small bold text)
- Options: "All categories" (value `'all'`) + one per category slug with display label

## Data Flow

```
user picks category
  → setCategory(slug)
    → load(range, false, slug)  [or category is in useEffect deps]
      → fetchStats(from, to, slug)
        → GET /stats?from=…&to=…&category=slug
          → queryStats(from, to, slug)
            → 6 parallel SQL queries (5 filtered, byCategory unfiltered)
          → StatsResponse
        → setStats(response)
          → all charts + stat cards re-render with filtered data
```

## Out of Scope

- Caching / memoisation of query results (premature for current data volume)
- URL sync (saving selected category in query string for shareability)
- Multi-category selection
