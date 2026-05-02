# scanJob — Design Spec
**Date:** 2026-05-02

## Overview

A scheduled job scraper that collects IT job listings from Seek and LinkedIn, enriches them with structured metadata (level, category, tech stack, salary), and serves them via a REST API to a small team.

Data is **not real-time** — scraped on a schedule (every 6 hours). Users query the API or a frontend to filter and browse listings.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | **Bun** | Faster than Node, TypeScript built-in, no compile step |
| Web framework | **Elysia** | TypeScript-first, fast, built for Bun |
| Scheduler | **croner** | Lightweight cron library, works natively with Bun |
| Seek scraper | **Playwright** | Required — Seek is behind Cloudflare bot protection |
| LinkedIn scraper | **fetch + Cheerio** | LinkedIn guest API works with plain HTTP, no browser needed |
| Database | **PostgreSQL** | Relational, supports arrays, powerful filtering/joins |
| LLM enrichment | **Claude API (Haiku)** | Cheap, fast — used only for ambiguous job classification |
| Deployment | **Railway** | Simple, supports PostgreSQL plugin, straightforward deploys |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   scanJob Server                     │
│                                                      │
│  ┌──────────────┐      ┌──────────────────────────┐ │
│  │  Elysia API  │      │     croner Scheduler      │ │
│  │              │      │  runs every 6 hours       │ │
│  │  GET /jobs   │      │                           │ │
│  │  GET /jobs/:id│      │  ┌──────┐  ┌──────────┐  │ │
│  │  GET /scrape/ │      │  │Seek  │  │LinkedIn  │  │ │
│  │    status    │      │  │Worker│  │Worker    │  │ │
│  │  POST /scrape/│      │  │(PW)  │  │(fetch+   │  │ │
│  │    trigger   │      │  │      │  │ Cheerio) │  │ │
│  └──────┬───────┘      └──┴──────┴──┴──────────┴──┘ │
│         │                         │                  │
│         │              ┌──────────▼───────────────┐  │
│         └─────────────►│       PostgreSQL DB       │  │
│                        │  jobs, cities,            │  │
│                        │  technologies,            │  │
│                        │  job_cities,              │  │
│                        │  job_technologies,        │  │
│                        │  scrape_runs              │  │
│                        └───────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

The API and scraper are **independent** — they share the DB but never call each other. If scraping breaks, the API continues serving cached data.

---

## Database Schema

### Tables

```sql
CREATE TABLE companies (
  id             SERIAL PRIMARY KEY,
  name           TEXT UNIQUE NOT NULL,  -- raw company name from scraper
  type           TEXT,                  -- 'startup', 'sme', 'enterprise', 'government', 'non-profit'
  size           TEXT,                  -- '1-10', '11-50', '51-200', '201-1000', '1000+'
  industry       TEXT,                  -- 'technology', 'finance', 'healthcare', etc.
  llm_confidence FLOAT,
  enriched_at    TIMESTAMP              -- null = not yet enriched by LLM
);

CREATE TABLE jobs (
  id               SERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  company          TEXT,                -- raw scraped name (kept for display)
  company_id       INTEGER REFERENCES companies(id),  -- null until company is enriched
  category         TEXT,             -- see categories below
  level            TEXT,             -- 'graduate', 'junior', 'mid', 'senior'
  salary_min       INTEGER,          -- AUD/year, null if not listed
  salary_max       INTEGER,
  source           TEXT NOT NULL,    -- 'seek' or 'linkedin'
  source_id        TEXT,             -- original job ID from source
  url              TEXT,
  description      TEXT,             -- raw text, used for enrichment
  classified_by    TEXT,             -- 'keyword', 'llm', or 'model'
  llm_confidence   FLOAT,            -- null if classified_by = 'keyword'
  posted_at        TIMESTAMP,
  scraped_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(source, source_id)
);

CREATE TABLE cities (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE technologies (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE job_cities (
  job_id  INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, city_id)
);

CREATE TABLE job_technologies (
  job_id  INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  tech_id INTEGER REFERENCES technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, tech_id)
);

CREATE TABLE scrape_runs (
  id          SERIAL PRIMARY KEY,
  source      TEXT NOT NULL,
  status      TEXT NOT NULL,    -- 'running', 'completed', 'failed'
  jobs_found  INTEGER DEFAULT 0,
  started_at  TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

CREATE TABLE corrections (
  id           SERIAL PRIMARY KEY,
  entity_type  TEXT NOT NULL,     -- 'job' or 'company'
  entity_id    INTEGER NOT NULL,  -- id in jobs or companies table
  field        TEXT NOT NULL,     -- e.g. 'category', 'level', 'type', 'size'
  old_value    TEXT,              -- value before correction (null if field was empty)
  new_value    TEXT NOT NULL,     -- value after correction
  note         TEXT,              -- optional human comment explaining the change
  corrected_at TIMESTAMP DEFAULT NOW()
);
```

Jobs and cities, and jobs and technologies, are **many-to-many** relationships — one job can list multiple cities and multiple tech skills.

---

## Job Categories

```
software-engineer
backend-developer
web-development
data-analyst
it-support
cyber-security
qa-tester
```

---

## API Endpoints

### `GET /jobs`

Query params:

| Param | Type | Example |
|---|---|---|
| `category` | string | `software-engineer` |
| `level` | comma-separated | `junior,graduate` |
| `city` | string | `Melbourne` |
| `tech` | comma-separated | `React,TypeScript` |
| `salary_min` | integer | `60000` |
| `page` | integer | `1` |
| `limit` | integer | `20` |

Response:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Junior Frontend Developer",
      "company": "Atlassian",
      "level": "junior",
      "category": "software-engineer",
      "salary_min": 70000,
      "salary_max": 90000,
      "cities": ["Melbourne", "Sydney"],
      "tech_stack": ["React", "TypeScript", "AWS"],
      "source": "seek",
      "url": "https://seek.com.au/...",
      "posted_at": "2026-05-01T08:00:00Z"
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 20
}
```

### `GET /jobs/:id`
Returns full job detail including raw description.

### `PATCH /jobs/:id`
Correct classification fields on a job. Updates the record and writes to the corrections log.

Request body:
```json
{
  "category": "backend-developer",
  "level": "senior",
  "note": "Title was misleading — description clearly shows senior backend role"
}
```

- Only the fields provided are updated (partial update)
- Sets `classified_by = 'human'` on the job row
- Writes one correction log entry per changed field

### `PATCH /companies/:id`
Correct company enrichment data.

Request body:
```json
{
  "type": "enterprise",
  "size": "1000+",
  "industry": "technology",
  "note": "Canva is clearly enterprise-scale now"
}
```

### `GET /corrections`
Returns the correction audit log, newest first.

```json
{
  "data": [
    {
      "id": 3,
      "entity_type": "job",
      "entity_id": 42,
      "field": "level",
      "old_value": "mid",
      "new_value": "senior",
      "note": "Title was misleading",
      "corrected_at": "2026-05-02T10:00:00Z"
    }
  ]
}
```

### `GET /scrape/status`
Returns last scrape time, status, and jobs found per source.

### `POST /scrape/trigger`
Manually triggers a scrape run. Useful during development.

---

## Scraper Design

### Seek (Playwright)
- Launch headless Chromium
- Navigate to Seek search URL per category
- Wait for job cards to load
- Extract: title, company, location, salary text, description, URL, job ID
- Paginate through results (max 5 pages per category per run)

### LinkedIn (fetch + Cheerio)
- HTTP GET to LinkedIn guest jobs API
- Parse HTML response with Cheerio
- Extract: title, company, location, description, URL, job ID
- Paginate with `start` offset param

---

## Data Enrichment Pipeline

```
Raw scraped job
      │
      ▼
Tech stack extraction    ← keyword match against known tech list (always)
      │
      ▼
Salary parsing           ← regex: "$80k–$100k" → { min: 80000, max: 100000 }
      │
      ▼
Level + Category         ← keyword match on title first
      │
   confident?
   ├── yes → save directly
   └── no  → LLM (Claude Haiku) — single call extracts both level + category
      │
      ▼
Save to PostgreSQL        ← UPSERT on (source, source_id) — no duplicates
```

### Keyword confidence rules

**Level keywords (title scan):**
- graduate: `graduate`, `grad role`, `new grad`
- junior: `junior`, `entry level`, `entry-level`
- senior: `senior`, `lead`, `principal`, `staff`, `head of`
- mid: default if none matched → escalate to LLM

**Category keywords (title scan):**
- `software-engineer`: `software engineer`, `software developer`
- `backend-developer`: `backend`, `back-end`, `back end`, `api developer`
- `web-development`: `web developer`, `frontend`, `front-end`, `ui developer`
- `data-analyst`: `data analyst`, `data scientist`, `business analyst`, `bi developer`
- `it-support`: `it support`, `helpdesk`, `help desk`, `service desk`, `sysadmin`
- `cyber-security`: `cyber`, `security engineer`, `penetration`, `infosec`, `soc analyst`
- `qa-tester`: `qa engineer`, `quality assurance`, `test engineer`, `tester`, `sdet`, `automation engineer`
- unmatched → escalate to LLM

### LLM prompt (Claude Haiku — ambiguous jobs only)
```
Given this job posting, classify it.

Title: {title}
Description: {first 500 chars of description}

Respond in JSON only:
{
  "category": "software-engineer" | "backend-developer" | "web-development" | "data-analyst" | "it-support" | "cyber-security" | "qa-tester" | "other",
  "level": "graduate" | "junior" | "mid" | "senior",
  "confidence": 0.0–1.0
}
```

### Company Enrichment

Company type and size are fetched once per unique company name via LLM and cached in the `companies` table permanently. Every subsequent job from the same company reuses the cached result — the LLM is never asked twice for the same company.

**Flow:**
```
Job scraped → company name extracted
      │
      ▼
companies table has this name?
  ├── yes → link job.company_id, done
  └── no  → ask LLM → save to companies → link job.company_id
```

**LLM prompt (Claude Haiku):**
```
Given this company name, what do you know about it?

Company: {name}

Respond in JSON only:
{
  "type": "startup" | "sme" | "enterprise" | "government" | "non-profit" | "unknown",
  "size": "1-10" | "11-50" | "51-200" | "201-1000" | "1000+" | "unknown",
  "industry": "technology" | "finance" | "healthcare" | "education" | "retail" | "consulting" | "other",
  "confidence": 0.0-1.0
}
```

**Company size definitions:**
- `startup` — early-stage, typically < 200 people, VC-backed or bootstrapped
- `sme` — small to medium enterprise, 11–200 people, established business
- `enterprise` — large organisation, 200+ people, well-known brand
- `government` — public sector, council, government agency
- `non-profit` — charity, NGO, not-for-profit

**API response includes company info:**
```json
{
  "id": 1,
  "title": "Junior Developer",
  "company": "Canva",
  "company_info": {
    "type": "enterprise",
    "size": "1000+",
    "industry": "technology"
  }
}
```

### Classification metadata

`classified_by` and `llm_confidence` are stored on each job row (see schema above). Low-confidence LLM labels (`confidence < 0.7`) are excluded from model training data to avoid poisoning the dataset. Jobs classified by keyword are treated as high-confidence ground truth.

---

## Optional: Train Your Own Classification Model

Over time, the LLM-classified jobs become a **labelled dataset** you can use to train a lightweight local model — eventually replacing the LLM API entirely for classification.

### Why bother?

| | Claude Haiku (LLM) | Your own model |
|---|---|---|
| Cost | ~$7/month | Free after training |
| Latency | 0.5–2s per job | ~1ms per job |
| Works offline | No | Yes |
| Accuracy | ~95% | ~90% (after enough data) |
| Needs retraining | No | Yes, as new job types emerge |

### How it works

```
Phase 1 — Data collection (months 1–2)
  LLM classifies ambiguous jobs → save label + job text to DB

Phase 2 — Training
  Export labelled jobs → train classifier → evaluate accuracy

Phase 3 — Replace
  Swap LLM call with local model inference
  Keep LLM as fallback for low-confidence predictions
```

### Recommended approach: fine-tune a small transformer

**Tool:** HuggingFace `transformers` + `datasets` (Python)
**Base model:** `distilbert-base-uncased` — small (66MB), fast, accurate for text classification

```python
# Training script (Python, run separately from the Bun server)
from transformers import pipeline, AutoModelForSequenceClassification

# Load your exported labelled jobs from PostgreSQL
# Fine-tune distilbert on category + level classification
# Export model to ./models/job-classifier
```

**Minimum training data needed:** ~200 labelled examples per category (~1,400 total for 7 categories). At 500 jobs/scrape run, you'll have enough data within 1–2 weeks.

**Human corrections are gold-standard training data.** Records with `classified_by = 'human'` should be weighted higher than LLM labels when training — a human explicitly reviewed and corrected these. Filter the export query to prioritise them:
```sql
SELECT title, description, category, level
FROM jobs
ORDER BY
  CASE classified_by WHEN 'human' THEN 0 WHEN 'keyword' THEN 1 ELSE 2 END,
  scraped_at DESC;
```

### Integration with the enrichment pipeline

```
Ambiguous job
     │
     ▼
Local model inference  ← fast, free, offline
     │
  confidence > 0.8?
  ├── yes → save result
  └── no  → Claude Haiku fallback
```

### What you'll learn building this

- Text classification with transformers (HuggingFace)
- How to export/import data between PostgreSQL and Python
- Model evaluation: precision, recall, confusion matrix
- How to serve a Python model from a Bun/Node server (via child process or REST)

This is an optional phase — the system works fully without it. Build it once you have enough labelled data and want to reduce API dependency.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Seek Cloudflare challenge | Log error, mark scrape_run as failed, retry next cycle |
| LinkedIn rate limited (429) | Exponential backoff: wait 30s, 60s, 120s before giving up |
| LLM API unavailable | Fall back to `level: 'mid'`, `category: 'other'` — do not block save |
| Duplicate job insert | PostgreSQL UNIQUE constraint silently skips via `ON CONFLICT DO NOTHING` |
| Playwright browser crash | Catch error, close browser, mark run failed, next cycle starts fresh |

---

## Deployment

- **Platform:** Railway
- **Services:** One web service (Bun + Elysia + croner + scrapers) + PostgreSQL plugin
- **Environment variables:** `DATABASE_URL`, `ANTHROPIC_API_KEY`
- **Playwright on Railway:** requires `playwright install chromium` in build step + `nixpacks` config for browser dependencies

---

## Project Structure

```
scanJob/
├── src/
│   ├── index.ts              ← Elysia server + croner scheduler
│   ├── api/
│   │   └── jobs.ts           ← GET /jobs, GET /jobs/:id
│   │   └── scrape.ts         ← GET /scrape/status, POST /scrape/trigger
│   ├── scrapers/
│   │   ├── seek.ts           ← Playwright scraper
│   │   └── linkedin.ts       ← fetch + Cheerio scraper
│   ├── enrichment/
│   │   ├── keywords.ts       ← tech stack, level, category keyword matching
│   │   ├── salary.ts         ← salary text → { min, max }
│   │   └── llm.ts            ← Claude Haiku fallback classifier
│   └── db/
│       ├── client.ts         ← PostgreSQL connection
│       ├── schema.sql        ← table definitions
│       └── jobs.ts           ← insert/upsert/query helpers
├── docs/
│   └── superpowers/specs/
│       └── 2026-05-02-job-scraper-design.md
├── .env
└── package.json
```
