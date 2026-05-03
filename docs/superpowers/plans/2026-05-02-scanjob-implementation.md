# scanJob Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scheduled job scraper that collects IT listings from Seek and LinkedIn, enriches them with level/category/tech/salary metadata, and serves filtered results via a REST API.

**Architecture:** Monolith — Bun + Elysia handles the API, croner runs scrapes once daily at noon inside the same process, enrichment pipeline classifies each job via keyword matching with Claude Haiku as fallback, results stored in PostgreSQL with many-to-many relations for cities and technologies.

**Tech Stack:** Bun, Elysia, croner, Playwright (Seek), fetch + Cheerio (LinkedIn), postgres.js, PostgreSQL, @anthropic-ai/sdk, Railway

---

## File Map

```
scanJob/
├── src/
│   ├── index.ts                      ← Elysia server + croner scheduler entry point
│   ├── types.ts                      ← shared RawJob + EnrichedJob types
│   ├── api/
│   │   ├── jobs.ts                   ← GET /jobs, GET /jobs/:id
│   │   ├── corrections.ts            ← PATCH /jobs/:id, PATCH /companies/:id, GET /corrections
│   │   └── scrape.ts                 ← GET /scrape/status, POST /scrape/trigger
│   ├── services/
│   │   └── corrections.ts            ← correctJob(), correctCompany() — owns transaction
│   ├── scrapers/
│   │   ├── index.ts                  ← runScrape() orchestrator
│   │   ├── seek.ts                   ← Playwright scraper
│   │   └── linkedin.ts               ← fetch + Cheerio scraper
│   ├── enrichment/
│   │   ├── index.ts                  ← enrich() pipeline orchestrator
│   │   ├── keywords.ts               ← extractTechStack, detectLevel, detectCategory
│   │   ├── salary.ts                 ← parseSalary text → { min, max }
│   │   ├── llm.ts                    ← classifyWithLLM (Claude Haiku)
│   │   └── company.ts                ← enrichCompany() — LLM company type/size lookup
│   └── db/
│       ├── client.ts                 ← postgres.js connection singleton
│       ├── schema.sql                ← CREATE TABLE statements
│       ├── migrate.ts                ← run schema.sql once
│       ├── jobs.ts                   ← upsertJob, queryJobs, getJobById, getScrapeStatus
│       ├── companies.ts              ← upsertCompany, getCompanyByName
│       └── corrections.ts            ← logCorrection, getCorrections
├── tests/
│   ├── enrichment/
│   │   ├── salary.test.ts
│   │   ├── keywords.test.ts
│   │   ├── llm.test.ts
│   │   └── company.test.ts
│   ├── db/
│   │   └── jobs.test.ts
│   └── api/
│       ├── jobs.test.ts
│       └── corrections.test.ts
├── .env.example
├── .gitignore
├── nixpacks.toml                     ← Railway deployment config
└── package.json
```

---

### Task 1: Project Setup

**What you're learning:** How Bun initialises a project, what `package.json` does, and why we list dependencies explicitly.

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Initialise git and bun project**

```bash
cd /Users/yi/code/scanJob
git init
bun init -y
```

Expected: creates `package.json`, `index.ts`, `tsconfig.json`, `README.md`, `node_modules/`

- [ ] **Step 2: Install all dependencies**

```bash
bun add elysia croner postgres cheerio @anthropic-ai/sdk
bun add playwright
bun add -d @types/cheerio
bunx playwright install chromium
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.env
.playwright/
```

- [ ] **Step 4: Create `.env.example`**

```
DATABASE_URL=postgres://localhost:5432/scanjob
TEST_DATABASE_URL=postgres://localhost:5432/scanjob_test
ANTHROPIC_API_KEY=your-key-here
PORT=3000
```

- [ ] **Step 5: Copy `.env.example` to `.env` and fill in your values**

```bash
cp .env.example .env
# Edit .env with your actual PostgreSQL connection string and Anthropic API key
```

- [ ] **Step 6: Create the PostgreSQL databases**

```bash
psql -U postgres -c "CREATE DATABASE scanjob;"
psql -U postgres -c "CREATE DATABASE scanjob_test;"
```

- [ ] **Step 7: Delete the default `index.ts` Bun created — we'll write our own**

```bash
rm index.ts
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: project setup with bun, elysia, playwright, postgres"
```

---

### Task 2: Database Schema + Connection

**What you're learning:** How PostgreSQL CREATE TABLE works, what `REFERENCES` and `ON DELETE CASCADE` mean, and how `postgres.js` connects to the DB using a tagged template literal API (which prevents SQL injection automatically).

**Files:**
- Create: `src/db/schema.sql`
- Create: `src/db/client.ts`
- Create: `src/db/migrate.ts`

- [ ] **Step 1: Create `src/db/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS companies (
  id             SERIAL PRIMARY KEY,
  name           TEXT UNIQUE NOT NULL,
  type           TEXT,
  size           TEXT,
  industry       TEXT,
  llm_confidence FLOAT,
  enriched_at    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  -- company_id links to companies table once enriched

  id               SERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  company          TEXT,
  company_id       INTEGER REFERENCES companies(id),
  category         TEXT,
  level            TEXT,
  salary_min       INTEGER,
  salary_max       INTEGER,
  source           TEXT NOT NULL,
  source_id        TEXT,
  url              TEXT,
  description      TEXT,
  classified_by    TEXT,
  llm_confidence   FLOAT,
  posted_at        TIMESTAMP,
  scraped_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(source, source_id)
);

CREATE TABLE IF NOT EXISTS cities (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS technologies (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS job_cities (
  job_id  INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, city_id)
);

CREATE TABLE IF NOT EXISTS job_technologies (
  job_id  INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  tech_id INTEGER REFERENCES technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, tech_id)
);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id          SERIAL PRIMARY KEY,
  source      TEXT NOT NULL,
  status      TEXT NOT NULL,
  jobs_found  INTEGER DEFAULT 0,
  started_at  TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS corrections (
  id           SERIAL PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    INTEGER NOT NULL,
  field        TEXT NOT NULL,
  old_value    TEXT,
  new_value    TEXT NOT NULL,
  note         TEXT,
  corrected_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **Step 2: Create `src/db/client.ts`**

```typescript
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
})

export default sql
```

**Why tagged template literals?** When you write `` sql`SELECT * FROM jobs WHERE id = ${id}` ``, postgres.js sends the query and the value separately to PostgreSQL — the value never gets embedded in the SQL string. This makes SQL injection impossible.

- [ ] **Step 3: Create `src/db/migrate.ts`**

```typescript
import { readFileSync } from 'fs'
import sql from './client'

const schema = readFileSync('./src/db/schema.sql', 'utf-8')
await sql.unsafe(schema)
await sql.end()
console.log('Migration complete')
```

**Why `sql.unsafe`?** The schema file contains multiple statements with no user input — it is safe. `sql.unsafe` is the escape hatch for running raw SQL strings like DDL (CREATE TABLE) that can't use template literal parameterisation.

- [ ] **Step 4: Run the migration**

```bash
bun run src/db/migrate.ts
```

Expected output: `Migration complete`

- [ ] **Step 5: Verify tables were created**

```bash
psql $DATABASE_URL -c "\dt"
```

Expected: lists `jobs`, `cities`, `technologies`, `job_cities`, `job_technologies`, `scrape_runs`

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.sql src/db/client.ts src/db/migrate.ts
git commit -m "feat: database schema and postgres.js client"
```

---

### Task 3: Shared Type Definitions

**What you're learning:** How TypeScript interfaces act as contracts between parts of your app. `RawJob` is what scrapers produce; `EnrichedJob` is what gets saved to the DB.

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```typescript
export type RawJob = {
  title: string
  company: string | null
  cities: string[]
  salaryText: string | null
  description: string
  url: string
  sourceId: string
  source: 'seek' | 'linkedin'
  postedAt: Date | null
}

export type EnrichedJob = {
  title: string
  company: string | null
  cities: string[]
  category: string
  level: string
  salaryMin: number | null
  salaryMax: number | null
  techStack: string[]
  source: 'seek' | 'linkedin'
  sourceId: string
  url: string
  description: string
  classifiedBy: 'keyword' | 'llm'
  llmConfidence: number | null
  postedAt: Date | null
}

export type CompanyInfo = {
  id: number
  name: string
  type: string | null
  size: string | null
  industry: string | null
}

export type JobFilters = {
  category?: string
  levels?: string[]
  city?: string
  techs?: string[]
  salaryMin?: number
  page?: number
  limit?: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: shared RawJob and EnrichedJob type definitions"
```

---

### Task 4: Salary Parsing

**What you're learning:** Test-driven development (TDD) — write a failing test first, then write the minimum code to make it pass. Also: how regex works to extract numbers from strings.

**Files:**
- Create: `tests/enrichment/salary.test.ts`
- Create: `src/enrichment/salary.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/enrichment/salary.test.ts
import { describe, it, expect } from 'bun:test'
import { parseSalary } from '../../src/enrichment/salary'

describe('parseSalary', () => {
  it('parses a dollar range with commas', () => {
    expect(parseSalary('$80,000 - $100,000')).toEqual({ min: 80000, max: 100000 })
  })

  it('parses a k-shorthand range', () => {
    expect(parseSalary('$80k - $100k')).toEqual({ min: 80000, max: 100000 })
  })

  it('parses a single value with plus', () => {
    expect(parseSalary('$90k+')).toEqual({ min: 90000, max: null })
  })

  it('returns nulls for non-numeric text', () => {
    expect(parseSalary('Competitive salary')).toEqual({ min: null, max: null })
  })

  it('returns nulls for null input', () => {
    expect(parseSalary(null)).toEqual({ min: null, max: null })
  })

  it('ignores noise values below 20000', () => {
    expect(parseSalary('$25 per hour')).toEqual({ min: null, max: null })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun test tests/enrichment/salary.test.ts
```

Expected: `6 fail` — `parseSalary` is not defined yet

- [ ] **Step 3: Implement `src/enrichment/salary.ts`**

```typescript
export type SalaryRange = { min: number | null; max: number | null }

export function parseSalary(text: string | null): SalaryRange {
  if (!text) return { min: null, max: null }

  const amounts = [...text.matchAll(/\$?([\d,]+)\s*k?/gi)]
    .map(m => {
      const n = parseFloat(m[1].replace(/,/g, ''))
      return /k/i.test(m[0].replace(m[1], '')) ? n * 1000 : n
    })
    .filter(n => n >= 20000)

  if (amounts.length === 0) return { min: null, max: null }
  if (amounts.length === 1) return { min: amounts[0], max: null }
  return { min: Math.min(...amounts), max: Math.max(...amounts) }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun test tests/enrichment/salary.test.ts
```

Expected: `6 pass`

- [ ] **Step 5: Commit**

```bash
git add src/enrichment/salary.ts tests/enrichment/salary.test.ts
git commit -m "feat: salary text parser with TDD"
```

---

### Task 5: Keyword Enrichment

**What you're learning:** How to use lookup tables (objects/maps) to classify text efficiently. Why keyword matching returns `null` for "not confident" rather than a default value.

**Files:**
- Create: `tests/enrichment/keywords.test.ts`
- Create: `src/enrichment/keywords.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/enrichment/keywords.test.ts
import { describe, it, expect } from 'bun:test'
import { extractTechStack, detectLevel, detectCategory } from '../../src/enrichment/keywords'

describe('extractTechStack', () => {
  it('extracts known tech keywords from description', () => {
    const desc = 'We use React, TypeScript and PostgreSQL in our stack.'
    expect(extractTechStack(desc)).toEqual(expect.arrayContaining(['React', 'TypeScript', 'PostgreSQL']))
  })

  it('returns empty array when no known techs found', () => {
    expect(extractTechStack('Great communication skills required.')).toEqual([])
  })
})

describe('detectLevel', () => {
  it('detects graduate from title', () => {
    expect(detectLevel('Graduate Software Engineer')).toBe('graduate')
  })

  it('detects junior from title', () => {
    expect(detectLevel('Junior Developer')).toBe('junior')
  })

  it('detects senior from title', () => {
    expect(detectLevel('Senior Backend Engineer')).toBe('senior')
  })

  it('returns null for ambiguous title', () => {
    expect(detectLevel('Software Engineer')).toBeNull()
  })
})

describe('detectCategory', () => {
  it('detects software-engineer', () => {
    expect(detectCategory('Software Developer')).toBe('software-engineer')
  })

  it('detects qa-tester', () => {
    expect(detectCategory('QA Engineer')).toBe('qa-tester')
  })

  it('detects cyber-security', () => {
    expect(detectCategory('SOC Analyst')).toBe('cyber-security')
  })

  it('returns null for ambiguous title', () => {
    expect(detectCategory('Digital Transformation Specialist')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun test tests/enrichment/keywords.test.ts
```

Expected: all fail

- [ ] **Step 3: Implement `src/enrichment/keywords.ts`**

```typescript
const TECH_KEYWORDS = [
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript',
  'Python', 'Java', 'Go', 'Rust', 'C#', 'PHP', 'Ruby',
  'Node.js', 'Express', 'Django', 'FastAPI', 'Spring',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
  'React Native', 'Flutter', 'Swift', 'Kotlin',
  'Git', 'Linux', 'Bash', 'PowerShell',
]

const LEVEL_KEYWORDS: Record<string, string[]> = {
  graduate: ['graduate', 'grad role', 'new grad'],
  junior:   ['junior', 'entry level', 'entry-level', 'jr.', 'jr '],
  senior:   ['senior', 'lead', 'principal', 'staff', 'head of', 'sr.', 'sr '],
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'software-engineer':  ['software engineer', 'software developer'],
  'backend-developer':  ['backend', 'back-end', 'back end', 'api developer'],
  'web-development':    ['web developer', 'frontend', 'front-end', 'ui developer'],
  'data-analyst':       ['data analyst', 'data scientist', 'business analyst', 'bi developer'],
  'it-support':         ['it support', 'helpdesk', 'help desk', 'service desk', 'sysadmin', 'systems administrator'],
  'cyber-security':     ['cyber', 'security engineer', 'penetration', 'infosec', 'soc analyst'],
  'qa-tester':          ['qa engineer', 'quality assurance', 'test engineer', 'tester', 'sdet', 'automation engineer'],
}

export function extractTechStack(description: string): string[] {
  const lower = description.toLowerCase()
  return TECH_KEYWORDS.filter(tech => lower.includes(tech.toLowerCase()))
}

export function detectLevel(title: string): string | null {
  const lower = title.toLowerCase()
  for (const [level, keywords] of Object.entries(LEVEL_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return level
  }
  return null
}

export function detectCategory(title: string): string | null {
  const lower = title.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category
  }
  return null
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun test tests/enrichment/keywords.test.ts
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/enrichment/keywords.ts tests/enrichment/keywords.test.ts
git commit -m "feat: keyword-based level, category, tech stack extraction"
```

---

### Task 6: LLM Classifier

**What you're learning:** How to call the Claude API, why we mock external services in tests (so tests don't cost money or require network), and how to use `spyOn` to replace a real function with a fake one during tests.

**Files:**
- Create: `tests/enrichment/llm.test.ts`
- Create: `src/enrichment/llm.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/enrichment/llm.test.ts
import { describe, it, expect, mock } from 'bun:test'

// Mock the Anthropic SDK before importing our module
const mockCreate = mock(async () => ({
  content: [{ type: 'text', text: '{"category":"software-engineer","level":"mid","confidence":0.88}' }]
}))

mock.module('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  }
}))

const { classifyWithLLM } = await import('../../src/enrichment/llm')

describe('classifyWithLLM', () => {
  it('returns parsed category, level and confidence', async () => {
    const result = await classifyWithLLM('Solutions Architect', 'Build and design cloud solutions...')
    expect(result).toEqual({ category: 'software-engineer', level: 'mid', confidence: 0.88 })
  })

  it('falls back to safe defaults when LLM returns invalid JSON', async () => {
    mockCreate.mockImplementationOnce(async () => ({
      content: [{ type: 'text', text: 'sorry I cannot help' }]
    }))
    const result = await classifyWithLLM('Unknown Role', '')
    expect(result).toEqual({ category: 'other', level: 'mid', confidence: 0 })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun test tests/enrichment/llm.test.ts
```

Expected: fail — `classifyWithLLM` not defined

- [ ] **Step 3: Implement `src/enrichment/llm.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type LLMClassification = {
  category: string
  level: string
  confidence: number
}

export async function classifyWithLLM(title: string, description: string): Promise<LLMClassification> {
  const prompt = `Given this job posting, classify it.

Title: ${title}
Description: ${description.slice(0, 500)}

Respond in JSON only:
{
  "category": "software-engineer" | "backend-developer" | "web-development" | "data-analyst" | "it-support" | "cyber-security" | "qa-tester" | "other",
  "level": "graduate" | "junior" | "mid" | "senior",
  "confidence": 0.0-1.0
}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return JSON.parse(text) as LLMClassification
  } catch {
    return { category: 'other', level: 'mid', confidence: 0 }
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun test tests/enrichment/llm.test.ts
```

Expected: 2 pass

- [ ] **Step 5: Commit**

```bash
git add src/enrichment/llm.ts tests/enrichment/llm.test.ts
git commit -m "feat: LLM classifier with Claude Haiku fallback"
```

---

### Task 7: Company Enrichment

**What you're learning:** How to build a cache layer — ask the LLM once per unique company name and store the result permanently so you never pay for the same lookup twice. Also introduces `src/db/companies.ts` as a dedicated DB module for the companies table.

**Files:**
- Create: `src/enrichment/company.ts`
- Create: `src/db/companies.ts`
- Create: `tests/enrichment/company.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/enrichment/company.test.ts
import { describe, it, expect, mock } from 'bun:test'

const mockCreate = mock(async () => ({
  content: [{ type: 'text', text: '{"type":"enterprise","size":"1000+","industry":"technology","confidence":0.95}' }]
}))

mock.module('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  }
}))

const { enrichCompany } = await import('../../src/enrichment/company')

describe('enrichCompany', () => {
  it('returns parsed company info from LLM', async () => {
    const result = await enrichCompany('Atlassian')
    expect(result).toEqual({
      type: 'enterprise',
      size: '1000+',
      industry: 'technology',
      confidence: 0.95,
    })
  })

  it('falls back to unknowns when LLM returns invalid JSON', async () => {
    mockCreate.mockImplementationOnce(async () => ({
      content: [{ type: 'text', text: 'not json' }]
    }))
    const result = await enrichCompany('Some Unknown Co')
    expect(result).toEqual({
      type: 'unknown',
      size: 'unknown',
      industry: 'other',
      confidence: 0,
    })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun test tests/enrichment/company.test.ts
```

Expected: fail — `enrichCompany` not defined

- [ ] **Step 3: Implement `src/enrichment/company.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type CompanyEnrichment = {
  type: string
  size: string
  industry: string
  confidence: number
}

export async function enrichCompany(name: string): Promise<CompanyEnrichment> {
  const prompt = `Given this company name, what do you know about it?

Company: ${name}

Respond in JSON only:
{
  "type": "startup" | "sme" | "enterprise" | "government" | "non-profit" | "unknown",
  "size": "1-10" | "11-50" | "51-200" | "201-1000" | "1000+" | "unknown",
  "industry": "technology" | "finance" | "healthcare" | "education" | "retail" | "consulting" | "other",
  "confidence": 0.0-1.0
}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return JSON.parse(text) as CompanyEnrichment
  } catch {
    return { type: 'unknown', size: 'unknown', industry: 'other', confidence: 0 }
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun test tests/enrichment/company.test.ts
```

Expected: 2 pass

- [ ] **Step 5: Create `src/db/companies.ts`**

```typescript
import sql from './client'
import type { CompanyEnrichment } from '../enrichment/company'

export async function getCompanyByName(name: string) {
  const [row] = await sql`
    SELECT * FROM companies WHERE name = ${name}
  `
  return row ?? null
}

export async function upsertCompany(name: string, data: CompanyEnrichment): Promise<number> {
  const [row] = await sql`
    INSERT INTO companies (name, type, size, industry, llm_confidence, enriched_at)
    VALUES (${name}, ${data.type}, ${data.size}, ${data.industry}, ${data.confidence}, NOW())
    ON CONFLICT (name) DO UPDATE SET
      type = EXCLUDED.type,
      size = EXCLUDED.size,
      industry = EXCLUDED.industry,
      llm_confidence = EXCLUDED.llm_confidence,
      enriched_at = NOW()
    RETURNING id
  `
  return row.id
}
```

- [ ] **Step 6: Commit**

```bash
git add src/enrichment/company.ts src/db/companies.ts tests/enrichment/company.test.ts
git commit -m "feat: company enrichment with LLM cache in companies table"
```

---

### Task 8: Enrichment Pipeline Orchestrator

**What you're learning:** How to compose multiple functions into a pipeline, and how to decide at runtime which path to take (keyword vs LLM).

**Files:**
- Create: `src/enrichment/index.ts`

- [ ] **Step 1: Create `src/enrichment/index.ts`**

```typescript
import type { RawJob, EnrichedJob } from '../types'
import { extractTechStack, detectLevel, detectCategory } from './keywords'
import { parseSalary } from './salary'
import { classifyWithLLM } from './llm'

export async function enrich(raw: RawJob): Promise<EnrichedJob> {
  const techStack = extractTechStack(raw.description)
  const { min: salaryMin, max: salaryMax } = parseSalary(raw.salaryText)

  let level = detectLevel(raw.title)
  let category = detectCategory(raw.title)
  let classifiedBy: 'keyword' | 'llm' = 'keyword'
  let llmConfidence: number | null = null

  // If either level or category is ambiguous, call LLM for both
  if (!level || !category) {
    const result = await classifyWithLLM(raw.title, raw.description)
    level = level ?? result.level
    category = category ?? result.category
    classifiedBy = 'llm'
    llmConfidence = result.confidence
  }

  return {
    ...raw,
    category: category!,
    level: level!,
    salaryMin,
    salaryMax,
    techStack,
    classifiedBy,
    llmConfidence,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/enrichment/index.ts
git commit -m "feat: enrichment pipeline orchestrator"
```

---

### Task 9: DB Helpers — Write

**What you're learning:** How to UPSERT (insert or skip on conflict), how to handle many-to-many inserts in sequence, and how to track scrape run state.

**Files:**
- Create: `src/db/jobs.ts` (write operations)

- [ ] **Step 1: Create `src/db/jobs.ts` with write helpers**

```typescript
import sql from './client'
import type { EnrichedJob } from '../types'

export async function startScrapeRun(source: string): Promise<number> {
  const [row] = await sql`
    INSERT INTO scrape_runs (source, status)
    VALUES (${source}, 'running')
    RETURNING id
  `
  return row.id
}

export async function finishScrapeRun(id: number, jobsFound: number): Promise<void> {
  await sql`
    UPDATE scrape_runs
    SET status = 'completed', jobs_found = ${jobsFound}, finished_at = NOW()
    WHERE id = ${id}
  `
}

export async function failScrapeRun(id: number): Promise<void> {
  await sql`
    UPDATE scrape_runs
    SET status = 'failed', finished_at = NOW()
    WHERE id = ${id}
  `
}

export async function upsertJob(job: EnrichedJob): Promise<number | null> {
  const [row] = await sql`
    INSERT INTO jobs (
      title, company, category, level,
      salary_min, salary_max, source, source_id,
      url, description, classified_by, llm_confidence, posted_at
    ) VALUES (
      ${job.title}, ${job.company}, ${job.category}, ${job.level},
      ${job.salaryMin}, ${job.salaryMax}, ${job.source}, ${job.sourceId},
      ${job.url}, ${job.description}, ${job.classifiedBy}, ${job.llmConfidence},
      ${job.postedAt}
    )
    ON CONFLICT (source, source_id) DO NOTHING
    RETURNING id
  `

  if (!row) return null // duplicate — skipped

  const jobId: number = row.id

  for (const cityName of job.cities) {
    const [city] = await sql`
      INSERT INTO cities (name) VALUES (${cityName})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `
    await sql`
      INSERT INTO job_cities (job_id, city_id) VALUES (${jobId}, ${city.id})
      ON CONFLICT DO NOTHING
    `
  }

  for (const techName of job.techStack) {
    const [tech] = await sql`
      INSERT INTO technologies (name) VALUES (${techName})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `
    await sql`
      INSERT INTO job_technologies (job_id, tech_id) VALUES (${jobId}, ${tech.id})
      ON CONFLICT DO NOTHING
    `
  }

  return jobId
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db/jobs.ts
git commit -m "feat: db write helpers — upsertJob, scrape run tracking"
```

---

### Task 10: DB Helpers — Read

**What you're learning:** How to write JOIN queries that aggregate many-to-many relationships back into arrays, and how to build dynamic WHERE clauses safely in postgres.js.

**Files:**
- Modify: `src/db/jobs.ts` (add read operations)

- [ ] **Step 1: Add read helpers to `src/db/jobs.ts`**

```typescript
import type { JobFilters } from '../types'

export type JobRow = {
  id: number
  title: string
  company: string | null
  category: string
  level: string
  salary_min: number | null
  salary_max: number | null
  source: string
  url: string
  posted_at: Date | null
  cities: string[]
  tech_stack: string[]
}

export async function queryJobs(filters: JobFilters): Promise<{ data: JobRow[]; total: number }> {
  const { category, levels, city, techs, salaryMin, page = 1, limit = 20 } = filters
  const offset = (page - 1) * limit

  const cf = category ? sql`AND j.category = ${category}` : sql``
  const lf = levels?.length ? sql`AND j.level = ANY(${levels})` : sql``
  const sf = salaryMin ? sql`AND j.salary_min >= ${salaryMin}` : sql``
  const cityf = city ? sql`AND j.id IN (
    SELECT jc.job_id FROM job_cities jc
    JOIN cities c ON jc.city_id = c.id WHERE c.name = ${city}
  )` : sql``
  const techf = techs?.length ? sql`AND j.id IN (
    SELECT jt.job_id FROM job_technologies jt
    JOIN technologies t ON jt.tech_id = t.id WHERE t.name = ANY(${techs})
  )` : sql``

  const data = await sql<JobRow[]>`
    SELECT j.id, j.title, j.company, j.category, j.level,
           j.salary_min, j.salary_max, j.source, j.url, j.posted_at,
           COALESCE(array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '{}') AS cities,
           COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tech_stack
    FROM jobs j
    LEFT JOIN job_cities jc ON j.id = jc.job_id
    LEFT JOIN cities c ON jc.city_id = c.id
    LEFT JOIN job_technologies jt ON j.id = jt.job_id
    LEFT JOIN technologies t ON jt.tech_id = t.id
    WHERE 1=1 ${cf} ${lf} ${sf} ${cityf} ${techf}
    GROUP BY j.id
    ORDER BY j.posted_at DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `

  const [{ count }] = await sql`
    SELECT COUNT(DISTINCT j.id) AS count
    FROM jobs j
    LEFT JOIN job_cities jc ON j.id = jc.job_id
    LEFT JOIN cities c ON jc.city_id = c.id
    LEFT JOIN job_technologies jt ON j.id = jt.job_id
    LEFT JOIN technologies t ON jt.tech_id = t.id
    WHERE 1=1 ${cf} ${lf} ${sf} ${cityf} ${techf}
  `

  return { data, total: Number(count) }
}

export async function getJobById(id: number) {
  const [job] = await sql`
    SELECT j.*,
           COALESCE(array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '{}') AS cities,
           COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tech_stack
    FROM jobs j
    LEFT JOIN job_cities jc ON j.id = jc.job_id
    LEFT JOIN cities c ON jc.city_id = c.id
    LEFT JOIN job_technologies jt ON j.id = jt.job_id
    LEFT JOIN technologies t ON jt.tech_id = t.id
    WHERE j.id = ${id}
    GROUP BY j.id
  `
  return job ?? null
}

export async function getScrapeStatus() {
  return await sql`
    SELECT source, status, jobs_found, started_at, finished_at
    FROM scrape_runs
    ORDER BY started_at DESC
    LIMIT 10
  `
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db/jobs.ts
git commit -m "feat: db read helpers — queryJobs with dynamic filters, getJobById, getScrapeStatus"
```

---

### Task 11: LinkedIn Scraper

**What you're learning:** How Cheerio works (it's like jQuery but runs in Node/Bun — loads HTML and lets you query it with CSS selectors), and how to paginate a simple HTTP API.

**Files:**
- Create: `src/scrapers/linkedin.ts`

- [ ] **Step 1: Create `src/scrapers/linkedin.ts`**

```typescript
import * as cheerio from 'cheerio'
import type { RawJob } from '../types'

const BASE_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-AU,en;q=0.9',
}

const SEARCH_TERMS = [
  'software engineer', 'backend developer', 'web developer',
  'data analyst', 'IT support', 'cyber security', 'QA engineer',
]

async function fetchPage(keyword: string, start: number): Promise<RawJob[]> {
  const url = `${BASE_URL}?keywords=${encodeURIComponent(keyword)}&location=Australia&start=${start}`

  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`LinkedIn returned ${res.status} for "${keyword}"`)

  const html = await res.text()
  const $ = cheerio.load(html)
  const jobs: RawJob[] = []

  $('.job-search-card').each((_, el) => {
    const title = $(el).find('.base-search-card__title').text().trim()
    const company = $(el).find('.base-search-card__subtitle').text().trim() || null
    const location = $(el).find('.job-search-card__location').text().trim()
    const url = $(el).find('a.base-card__full-link').attr('href') ?? ''
    const entityUrn = $(el).attr('data-entity-urn') ?? ''
    const sourceId = entityUrn.split(':').pop() ?? url

    if (!title || !sourceId) return

    const cities = location
      ? location.split(',').map(s => s.trim()).filter(Boolean)
      : []

    jobs.push({
      title,
      company,
      cities,
      salaryText: null,
      description: '',
      url,
      sourceId,
      source: 'linkedin',
      postedAt: null,
    })
  })

  return jobs
}

export async function scrapeLinkedIn(): Promise<RawJob[]> {
  const all: RawJob[] = []

  for (const keyword of SEARCH_TERMS) {
    for (let start = 0; start < 100; start += 25) {
      try {
        const jobs = await fetchPage(keyword, start)
        if (jobs.length === 0) break
        all.push(...jobs)
        // Polite delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 1500))
      } catch (err) {
        console.error(`LinkedIn scrape failed for "${keyword}" at offset ${start}:`, err)
        break
      }
    }
  }

  // Deduplicate by sourceId
  const seen = new Set<string>()
  return all.filter(job => {
    if (seen.has(job.sourceId)) return false
    seen.add(job.sourceId)
    return true
  })
}
```

- [ ] **Step 2: Test the LinkedIn scraper manually**

```bash
bun run -e "
import { scrapeLinkedIn } from './src/scrapers/linkedin'
const jobs = await scrapeLinkedIn()
console.log('Jobs found:', jobs.length)
console.log('First job:', jobs[0])
"
```

Expected: prints job count and a sample job object

- [ ] **Step 3: Commit**

```bash
git add src/scrapers/linkedin.ts
git commit -m "feat: LinkedIn scraper using fetch and Cheerio"
```

---

### Task 12: Seek Scraper

**What you're learning:** How Playwright automates a real browser — it launches Chromium, navigates pages, waits for elements to appear in the DOM, then reads them. This is how you bypass JavaScript-rendered pages that simple HTTP can't access.

**Files:**
- Create: `src/scrapers/seek.ts`

- [ ] **Step 1: Create `src/scrapers/seek.ts`**

```typescript
import { chromium } from 'playwright'
import type { RawJob } from '../types'

const CATEGORY_URLS: Record<string, string> = {
  'software-engineer': 'software-engineer-jobs',
  'backend-developer': 'backend-developer-jobs',
  'web-development':   'web-developer-jobs',
  'data-analyst':      'data-analyst-jobs',
  'it-support':        'it-support-jobs',
  'cyber-security':    'cyber-security-jobs',
  'qa-tester':         'testing-qa-jobs',
}

async function scrapeCategory(
  page: Awaited<ReturnType<typeof chromium.launch>>['contexts'][0]['pages'][0],
  categorySlug: string
): Promise<RawJob[]> {
  const jobs: RawJob[] = []

  for (let pageNum = 1; pageNum <= 5; pageNum++) {
    const url = `https://www.seek.com.au/${categorySlug}/in-Australia?page=${pageNum}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Wait for job cards or no-results message
    await page.waitForSelector('[data-testid="job-card"], [data-testid="no-results"]', {
      timeout: 15000,
    }).catch(() => {})

    const pageJobs = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="job-card"]')
      return Array.from(cards).map(card => {
        const titleEl = card.querySelector('[data-testid="job-card-title"] a')
        const companyEl = card.querySelector('[data-testid="job-card-advertiser"] a, [data-testid="job-card-company"]')
        const locationEl = card.querySelector('[data-testid="job-card-location"]')
        const salaryEl = card.querySelector('[data-testid="job-card-salary"]')
        const jobId = card.getAttribute('data-job-id') ?? titleEl?.getAttribute('href') ?? ''

        return {
          title: titleEl?.textContent?.trim() ?? '',
          company: companyEl?.textContent?.trim() ?? null,
          locationText: locationEl?.textContent?.trim() ?? '',
          salaryText: salaryEl?.textContent?.trim() ?? null,
          url: titleEl ? `https://www.seek.com.au${titleEl.getAttribute('href') ?? ''}` : '',
          sourceId: jobId,
        }
      })
    })

    if (pageJobs.length === 0) break

    for (const j of pageJobs) {
      if (!j.title || !j.sourceId) continue
      jobs.push({
        title: j.title,
        company: j.company,
        cities: j.locationText ? [j.locationText.split(',')[0].trim()] : [],
        salaryText: j.salaryText,
        description: '',
        url: j.url,
        sourceId: j.sourceId,
        source: 'seek',
        postedAt: null,
      })
    }

    // Small delay between pages
    await new Promise(r => setTimeout(r, 1000))
  }

  return jobs
}

export async function scrapeSeek(): Promise<RawJob[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-AU',
  })
  const page = await context.newPage()

  const all: RawJob[] = []

  try {
    for (const [, slug] of Object.entries(CATEGORY_URLS)) {
      try {
        const jobs = await scrapeCategory(page, slug)
        all.push(...jobs)
        console.log(`Seek: scraped ${jobs.length} jobs for ${slug}`)
      } catch (err) {
        console.error(`Seek scrape failed for ${slug}:`, err)
      }
    }
  } finally {
    await browser.close()
  }

  const seen = new Set<string>()
  return all.filter(job => {
    if (seen.has(job.sourceId)) return false
    seen.add(job.sourceId)
    return true
  })
}
```

- [ ] **Step 2: Test the Seek scraper manually (headless: false to watch it run)**

Change `headless: true` to `headless: false` temporarily, then:

```bash
bun run -e "
import { scrapeSeek } from './src/scrapers/seek'
const jobs = await scrapeSeek()
console.log('Jobs found:', jobs.length)
console.log('First job:', jobs[0])
"
```

Expected: A browser window opens, navigates Seek, prints job results. Change `headless` back to `true` after verifying.

- [ ] **Step 3: Commit**

```bash
git add src/scrapers/seek.ts
git commit -m "feat: Seek scraper using Playwright headless Chromium"
```

---

### Task 13: Scraper Orchestrator

**What you're learning:** How to tie scrapers, enrichment, and DB writes into one coordinated flow, and how to record success/failure for each run.

**Files:**
- Create: `src/scrapers/index.ts`

- [ ] **Step 1: Create `src/scrapers/index.ts`**

```typescript
import { scrapeSeek } from './seek'
import { scrapeLinkedIn } from './linkedin'
import { enrich } from '../enrichment'
import { upsertJob, startScrapeRun, finishScrapeRun, failScrapeRun } from '../db/jobs'

export async function runScrape(): Promise<void> {
  const sources = [
    { name: 'linkedin' as const, scraper: scrapeLinkedIn },
    { name: 'seek' as const, scraper: scrapeSeek },
  ]

  for (const { name, scraper } of sources) {
    const runId = await startScrapeRun(name)
    console.log(`[${name}] scrape started (run #${runId})`)

    try {
      const rawJobs = await scraper()
      let saved = 0

      for (const raw of rawJobs) {
        const enriched = await enrich(raw)
        const id = await upsertJob(enriched)
        if (id !== null) saved++
      }

      await finishScrapeRun(runId, saved)
      console.log(`[${name}] scrape complete — ${saved} new jobs saved`)
    } catch (err) {
      await failScrapeRun(runId)
      console.error(`[${name}] scrape failed:`, err)
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scrapers/index.ts
git commit -m "feat: scraper orchestrator — runs seek + linkedin, enriches, saves to DB"
```

---

### Task 14: Jobs API

**What you're learning:** How Elysia defines routes, how query parameters are parsed, and how to test HTTP routes without running a real server using `app.handle()`.

**Files:**
- Create: `src/api/jobs.ts`
- Create: `tests/api/jobs.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/api/jobs.test.ts
import { describe, it, expect, mock } from 'bun:test'

// Mock db before importing API
mock.module('../../src/db/jobs', () => ({
  queryJobs: mock(async () => ({
    data: [
      {
        id: 1,
        title: 'Junior React Developer',
        company: 'Atlassian',
        category: 'web-development',
        level: 'junior',
        salary_min: 70000,
        salary_max: 90000,
        source: 'seek',
        url: 'https://seek.com.au/job/123',
        posted_at: new Date('2026-05-01'),
        cities: ['Melbourne'],
        tech_stack: ['React', 'TypeScript'],
      },
    ],
    total: 1,
  })),
  getJobById: mock(async (id: number) =>
    id === 1
      ? { id: 1, title: 'Junior React Developer', description: 'Full job description...' }
      : null
  ),
}))

const { jobsRoute } = await import('../../src/api/jobs')
const { Elysia } = await import('elysia')

const app = new Elysia().use(jobsRoute)

describe('GET /jobs', () => {
  it('returns paginated job list', async () => {
    const res = await app.handle(new Request('http://localhost/jobs'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.data[0].title).toBe('Junior React Developer')
  })

  it('accepts category filter', async () => {
    const res = await app.handle(new Request('http://localhost/jobs?category=web-development'))
    expect(res.status).toBe(200)
  })
})

describe('GET /jobs/:id', () => {
  it('returns job detail for valid id', async () => {
    const res = await app.handle(new Request('http://localhost/jobs/1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(1)
  })

  it('returns 404 for unknown id', async () => {
    const res = await app.handle(new Request('http://localhost/jobs/999'))
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun test tests/api/jobs.test.ts
```

Expected: fail — `jobsRoute` not defined

- [ ] **Step 3: Implement `src/api/jobs.ts`**

```typescript
import { Elysia, t } from 'elysia'
import { queryJobs, getJobById } from '../db/jobs'

export const jobsRoute = new Elysia()
  .get('/jobs', async ({ query }) => {
    const filters = {
      category: query.category,
      levels: query.level?.split(',').filter(Boolean),
      city: query.city,
      techs: query.tech?.split(',').filter(Boolean),
      salaryMin: query.salary_min ? Number(query.salary_min) : undefined,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    }

    const { data, total } = await queryJobs(filters)

    return {
      data: data.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        level: j.level,
        category: j.category,
        salary_min: j.salary_min,
        salary_max: j.salary_max,
        cities: j.cities,
        tech_stack: j.tech_stack,
        source: j.source,
        url: j.url,
        posted_at: j.posted_at,
      })),
      total,
      page: filters.page,
      limit: filters.limit,
    }
  })
  .get('/jobs/:id', async ({ params, set }) => {
    const job = await getJobById(Number(params.id))
    if (!job) {
      set.status = 404
      return { error: 'Job not found' }
    }
    return job
  })
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun test tests/api/jobs.test.ts
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/api/jobs.ts tests/api/jobs.test.ts
git commit -m "feat: GET /jobs and GET /jobs/:id API routes with filters"
```

---

### Task 15: Corrections API

**What you're learning:** The service layer exists to enforce business rules — here the rule is "a field change and its log entry must be atomic: both succeed or neither does." The service owns the transaction and coordinates two repositories. The controller stays clean with no SQL or transaction logic.

```
Controller (api/corrections.ts)
    │
    ▼
Service    (services/corrections.ts)  ← owns sql.begin(), enforces atomicity
    ├──► Repository (db/jobs.ts)       ← updateJobField(tx)
    ├──► Repository (db/companies.ts)  ← updateCompanyField(tx)
    └──► Repository (db/corrections.ts)← logCorrection(tx)
```

**Files:**
- Create: `src/db/corrections.ts`
- Create: `src/db/jobs.ts` — add `updateJobField(tx?)`
- Create: `src/db/companies.ts` — add `updateCompanyField(tx?)`
- Create: `src/services/corrections.ts`
- Create: `src/api/corrections.ts`
- Create: `tests/api/corrections.test.ts`

- [ ] **Step 1: Create `src/db/corrections.ts`**

```typescript
import sql from './client'

export type CorrectionParams = {
  entityType: 'job' | 'company'
  entityId: number
  field: string
  oldValue: string | null
  newValue: string
  note?: string
}

// Accepts optional tx — when inside a transaction, pass tx instead of sql
export async function logCorrection(
  params: CorrectionParams,
  tx: typeof sql = sql
): Promise<void> {
  await tx`
    INSERT INTO corrections (entity_type, entity_id, field, old_value, new_value, note)
    VALUES (
      ${params.entityType}, ${params.entityId}, ${params.field},
      ${params.oldValue}, ${params.newValue}, ${params.note ?? null}
    )
  `
}

export async function getCorrections(limit = 50) {
  return await sql`
    SELECT * FROM corrections
    ORDER BY corrected_at DESC
    LIMIT ${limit}
  `
}
```

- [ ] **Step 2: Add `updateJobField` to `src/db/jobs.ts`**

```typescript
// Add to existing src/db/jobs.ts
export async function updateJobField(
  id: number,
  field: string,
  value: string,
  tx: typeof sql = sql
): Promise<void> {
  await tx`
    UPDATE jobs
    SET ${tx(field)} = ${value}, classified_by = 'human'
    WHERE id = ${id}
  `
}
```

- [ ] **Step 3: Add `updateCompanyField` and `getCompanyById` to `src/db/companies.ts`**

```typescript
// Add to existing src/db/companies.ts
export async function getCompanyById(id: number) {
  const [row] = await sql`SELECT * FROM companies WHERE id = ${id}`
  return row ?? null
}

export async function updateCompanyField(
  id: number,
  field: string,
  value: string,
  tx: typeof sql = sql
): Promise<void> {
  await tx`
    UPDATE companies
    SET ${tx(field)} = ${value}, enriched_at = NOW()
    WHERE id = ${id}
  `
}
```

- [ ] **Step 4: Create `src/services/corrections.ts`**

**Why this is a service:** It enforces the invariant that a field change and its log entry always happen together atomically. Without a transaction, a crash between the UPDATE and the INSERT would leave the data changed but unlogged.

```typescript
import sql from '../db/client'
import { updateJobField } from '../db/jobs'
import { updateCompanyField } from '../db/companies'
import { logCorrection } from '../db/corrections'

export const JOB_CORRECTABLE_FIELDS = ['category', 'level'] as const
export const COMPANY_CORRECTABLE_FIELDS = ['type', 'size', 'industry'] as const

export async function correctJob(params: {
  jobId: number
  field: string
  oldValue: string | null
  newValue: string
  note?: string
}): Promise<void> {
  await sql.begin(async (tx) => {
    await updateJobField(params.jobId, params.field, params.newValue, tx)
    await logCorrection({ entityType: 'job', entityId: params.jobId, ...params }, tx)
  })
}

export async function correctCompany(params: {
  companyId: number
  field: string
  oldValue: string | null
  newValue: string
  note?: string
}): Promise<void> {
  await sql.begin(async (tx) => {
    await updateCompanyField(params.companyId, params.field, params.newValue, tx)
    await logCorrection({ entityType: 'company', entityId: params.companyId, ...params }, tx)
  })
}
```

- [ ] **Step 5: Write failing tests**

```typescript
// tests/api/corrections.test.ts
import { describe, it, expect, mock } from 'bun:test'

// Mock the SERVICE — controller only talks to service
mock.module('../../src/services/corrections', () => ({
  correctJob: mock(async () => {}),
  correctCompany: mock(async () => {}),
  JOB_CORRECTABLE_FIELDS: ['category', 'level'],
  COMPANY_CORRECTABLE_FIELDS: ['type', 'size', 'industry'],
}))

mock.module('../../src/db/jobs', () => ({
  getJobById: mock(async (id: number) =>
    id === 42
      ? { id: 42, category: 'software-engineer', level: 'mid' }
      : null
  ),
}))

mock.module('../../src/db/companies', () => ({
  getCompanyById: mock(async (id: number) =>
    id === 7
      ? { id: 7, type: 'startup', size: '11-50', industry: 'technology' }
      : null
  ),
}))

mock.module('../../src/db/corrections', () => ({
  getCorrections: mock(async () => [
    {
      id: 1, entity_type: 'job', entity_id: 42,
      field: 'level', old_value: 'mid', new_value: 'senior',
      note: 'Title was misleading', corrected_at: new Date('2026-05-02'),
    },
  ]),
}))

const { correctionsRoute } = await import('../../src/api/corrections')
const { Elysia } = await import('elysia')
const app = new Elysia().use(correctionsRoute)

describe('PATCH /jobs/:id', () => {
  it('returns 200 with list of updated fields', async () => {
    const res = await app.handle(
      new Request('http://localhost/jobs/42', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'senior', note: 'Title was misleading' }),
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toContain('level')
  })

  it('returns 404 for unknown job', async () => {
    const res = await app.handle(
      new Request('http://localhost/jobs/999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'senior' }),
      })
    )
    expect(res.status).toBe(404)
  })

  it('skips fields with unchanged value', async () => {
    const res = await app.handle(
      new Request('http://localhost/jobs/42', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'software-engineer' }), // same value
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toHaveLength(0)
  })
})

describe('GET /corrections', () => {
  it('returns the correction log', async () => {
    const res = await app.handle(new Request('http://localhost/corrections'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0].field).toBe('level')
  })
})
```

- [ ] **Step 6: Run tests — verify they fail**

```bash
bun test tests/api/corrections.test.ts
```

Expected: fail — `correctionsRoute` not defined

- [ ] **Step 7: Implement `src/api/corrections.ts`**

```typescript
import { Elysia } from 'elysia'
import { getJobById } from '../db/jobs'
import { getCompanyById } from '../db/companies'
import { getCorrections } from '../db/corrections'
import {
  correctJob, correctCompany,
  JOB_CORRECTABLE_FIELDS, COMPANY_CORRECTABLE_FIELDS,
} from '../services/corrections'

export const correctionsRoute = new Elysia()
  .patch('/jobs/:id', async ({ params, body, set }: any) => {
    const job = await getJobById(Number(params.id))
    if (!job) { set.status = 404; return { error: 'Job not found' } }

    const { note, ...fields } = body as Record<string, string>
    const updated: string[] = []

    for (const field of JOB_CORRECTABLE_FIELDS) {
      if (!fields[field] || fields[field] === job[field]) continue
      await correctJob({ jobId: job.id, field, oldValue: job[field] ?? null, newValue: fields[field], note })
      updated.push(field)
    }

    return { updated, jobId: job.id }
  })

  .patch('/companies/:id', async ({ params, body, set }: any) => {
    const company = await getCompanyById(Number(params.id))
    if (!company) { set.status = 404; return { error: 'Company not found' } }

    const { note, ...fields } = body as Record<string, string>
    const updated: string[] = []

    for (const field of COMPANY_CORRECTABLE_FIELDS) {
      if (!fields[field] || fields[field] === company[field]) continue
      await correctCompany({ companyId: company.id, field, oldValue: company[field] ?? null, newValue: fields[field], note })
      updated.push(field)
    }

    return { updated, companyId: company.id }
  })

  .get('/corrections', async ({ query }: any) => {
    const data = await getCorrections(query.limit ? Number(query.limit) : 50)
    return { data }
  })
```

- [ ] **Step 8: Run tests — verify they pass**

```bash
bun test tests/api/corrections.test.ts
```

Expected: all pass

- [ ] **Step 9: Commit**

```bash
git add src/db/corrections.ts src/db/jobs.ts src/db/companies.ts \
        src/services/corrections.ts src/api/corrections.ts \
        tests/api/corrections.test.ts
git commit -m "feat: corrections with service layer — atomic update + log via transaction"
```

---

### Task 16: Scrape API + Entry Point

**What you're learning:** How croner schedules work inside a long-running process, and how `fire and forget` (calling async without awaiting) lets an endpoint return immediately while a slow job runs in the background.

**Files:**
- Create: `src/api/scrape.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Create `src/api/scrape.ts`**

```typescript
import { Elysia } from 'elysia'
import { getScrapeStatus } from '../db/jobs'
import { runScrape } from '../scrapers'

export const scrapeRoute = new Elysia()
  .get('/scrape/status', async () => {
    const runs = await getScrapeStatus()
    return { runs }
  })
  .post('/scrape/trigger', () => {
    // Fire and forget — don't await so the response returns immediately
    runScrape().catch(err => console.error('Manual scrape failed:', err))
    return { message: 'Scrape started' }
  })
```

- [ ] **Step 2: Create `src/index.ts`**

```typescript
import { Elysia } from 'elysia'
import { Cron } from 'croner'
import { jobsRoute } from './api/jobs'
import { scrapeRoute } from './api/scrape'
import { runScrape } from './scrapers'

const app = new Elysia()
  .get('/health', () => ({ ok: true, time: new Date().toISOString() }))
  .use(jobsRoute)
  .use(scrapeRoute)
  .listen(process.env.PORT ?? 3000)

console.log(`Server running on http://localhost:${app.server?.port}`)

// Schedule scrapes every day at noon (12:00 AEST)
new Cron('0 12 * * *', () => {
  console.log('[cron] Starting scheduled scrape...')
  runScrape().catch(err => console.error('[cron] Scrape failed:', err))
})

console.log('[cron] Scrape scheduled daily at noon')
```

- [ ] **Step 3: Run the server and verify it starts**

```bash
bun run src/index.ts
```

Expected output:
```
Server running on http://localhost:3000
[cron] Scrape scheduled every 6 hours
```

- [ ] **Step 4: Test the health endpoint**

```bash
curl http://localhost:3000/health
```

Expected: `{"ok":true,"time":"..."}`

- [ ] **Step 5: Trigger a manual scrape**

```bash
curl -X POST http://localhost:3000/scrape/trigger
```

Expected: `{"message":"Scrape started"}` — check your terminal for scrape progress logs

- [ ] **Step 6: Query the jobs after scrape completes**

```bash
curl "http://localhost:3000/jobs?category=software-engineer&limit=5"
```

Expected: JSON with job listings

- [ ] **Step 7: Commit**

```bash
git add src/api/scrape.ts src/index.ts
git commit -m "feat: scrape API routes and main entry point with croner scheduler"
```

---

### Task 17: Railway Deployment

**What you're learning:** How Railway deploys a Bun server, why Playwright needs special system packages on Linux (it's not just a Node library — it ships real browser binaries), and what environment variables are.

**Files:**
- Create: `nixpacks.toml`
- Create: `.env.example` update

- [ ] **Step 1: Create `nixpacks.toml`** (tells Railway how to build and run the app)

```toml
[phases.setup]
nixPkgs = [
  "nodejs_20",
  "chromium",
  "nss",
  "nspr",
  "atk",
  "cups",
  "libdrm",
  "dbus",
  "libxkbcommon",
  "xorg.libXcomposite",
  "xorg.libXdamage",
  "xorg.libXext",
  "xorg.libXfixes",
  "xorg.libXrandr",
  "pango",
  "cairo",
  "alsa-lib",
]

[phases.install]
cmds = [
  "curl -fsSL https://bun.sh/install | bash",
  "export PATH=$HOME/.bun/bin:$PATH && bun install",
  "export PATH=$HOME/.bun/bin:$PATH && bunx playwright install chromium",
]

[start]
cmd = "bun run src/index.ts"
```

- [ ] **Step 2: Add `start` script to `package.json`**

Open `package.json` and ensure it includes:

```json
{
  "scripts": {
    "start": "bun run src/index.ts",
    "migrate": "bun run src/db/migrate.ts"
  }
}
```

- [ ] **Step 3: Commit deployment config**

```bash
git add nixpacks.toml package.json
git commit -m "chore: Railway deployment config with Playwright browser support"
```

- [ ] **Step 4: Create Railway project**

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Add a **PostgreSQL** plugin to the project
3. Railway auto-sets `DATABASE_URL` from the plugin — no manual copy needed

- [ ] **Step 5: Set environment variables in Railway**

In Railway → your service → Variables tab, add:
```
ANTHROPIC_API_KEY=your-key-here
PORT=3000
```

- [ ] **Step 6: Run migration on Railway**

In Railway → your service → Settings → Deploy → Custom Start Command, temporarily set:
```
bun run src/db/migrate.ts
```
Redeploy once to run the migration, then switch back to:
```
bun run src/index.ts
```

- [ ] **Step 7: Verify the live deployment**

```bash
curl https://your-app.railway.app/health
curl https://your-app.railway.app/scrape/status
```

---

## Run All Tests

```bash
bun test
```

Expected: all tests in `tests/` pass. Scraper tests are manual only (they require network access and real browser).

---

## What You've Built — Learning Summary

| Task | Technology | Concept learned |
|---|---|---|
| 1 | Bun | Runtime, package manager, TypeScript without config |
| 2 | postgres.js | Tagged template SQL, migrations, connection pooling |
| 3 | TypeScript | Interfaces as contracts between modules |
| 4–5 | bun:test | TDD — write failing test first, then implement |
| 6 | Anthropic SDK + mocking | External API calls, test isolation with mocks |
| 7 | Enrichment pipeline | Function composition, conditional logic |
| 8–9 | SQL JOINs + UPSERT | Many-to-many relations, conflict resolution |
| 10 | Cheerio | HTML parsing with CSS selectors |
| 11 | Playwright | Browser automation for JS-rendered pages |
| 12 | Scraper orchestrator | Error handling, run tracking |
| 13 | Elysia | HTTP routing, query params, 404 handling |
| 14 | croner | Cron scheduling inside a long-running process |
| 15 | Railway + nixpacks | Cloud deployment, environment variables, Linux browser deps |
