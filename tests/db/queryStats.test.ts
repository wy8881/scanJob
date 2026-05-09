import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { queryStats } from '../../src/db/stats'
import { upsertJob } from '../../src/db/jobs'
import sql from '../../src/db/client'

const NOW = new Date()
const FROM = new Date(NOW.getFullYear(), NOW.getMonth(), 1)
const TO = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0)

const SEEDS = [
  {
    title: 'Senior Software Engineer',
    company: 'Acme',
    cities: ['Sydney'],
    category: 'software-engineer',
    level: 'senior',
    techStack: ['TypeScript', 'React'],
    source: 'seek' as const,
    sourceId: 'test-qs-001',
    url: 'https://seek.com.au/job/qs001',
    description: '',
    classifiedBy: 'keyword' as const,
    llmConfidence: null,
    postedAt: NOW,
  },
  {
    title: 'Junior Software Engineer',
    company: 'BetaCorp',
    cities: ['Melbourne'],
    category: 'software-engineer',
    level: 'junior',
    techStack: ['TypeScript'],
    source: 'seek' as const,
    sourceId: 'test-qs-002',
    url: 'https://seek.com.au/job/qs002',
    description: '',
    classifiedBy: 'keyword' as const,
    llmConfidence: null,
    postedAt: NOW,
  },
  {
    title: 'Senior Data Analyst',
    company: 'DataCo',
    cities: ['Brisbane'],
    category: 'data-analyst',
    level: 'senior',
    techStack: ['Python'],
    source: 'seek' as const,
    sourceId: 'test-qs-003',
    url: 'https://seek.com.au/job/qs003',
    description: '',
    classifiedBy: 'keyword' as const,
    llmConfidence: null,
    postedAt: NOW,
  },
]

beforeAll(async () => {
  for (const job of SEEDS) await upsertJob(job)
})

afterAll(async () => {
  await sql`
    DELETE FROM jobs WHERE id IN (
      SELECT job_id FROM job_listings WHERE source_id LIKE 'test-qs-%'
    )
  `
})

describe('queryStats', () => {
  it('returns all jobs when no category given', async () => {
    const result = await queryStats(FROM, TO)
    expect(result.meta.totalJobs).toBeGreaterThanOrEqual(3)
  })

  it('filters meta.totalJobs by category', async () => {
    const all = await queryStats(FROM, TO)
    const filtered = await queryStats(FROM, TO, 'software-engineer')
    expect(filtered.meta.totalJobs).toBeLessThan(all.meta.totalJobs)
    expect(filtered.meta.totalJobs).toBeGreaterThanOrEqual(2)
  })

  it('byCategory is always unfiltered regardless of category param', async () => {
    const all = await queryStats(FROM, TO)
    const filtered = await queryStats(FROM, TO, 'software-engineer')
    expect(filtered.byCategory.length).toBe(all.byCategory.length)
    const cats = filtered.byCategory.map(r => r.category)
    expect(cats).toContain('data-analyst')
  })

  it('byTech only includes tech from filtered category', async () => {
    const filtered = await queryStats(FROM, TO, 'data-analyst')
    const techs = filtered.byTech.map(r => r.tech)
    expect(techs).toContain('Python')
    expect(techs).not.toContain('React')
  })

  it('byLevel only counts jobs from filtered category', async () => {
    const filtered = await queryStats(FROM, TO, 'software-engineer')
    const seniorRow = filtered.byLevel.find(r => r.level === 'senior')
    const juniorRow = filtered.byLevel.find(r => r.level === 'junior')
    expect(seniorRow).toBeDefined()
    expect(juniorRow).toBeDefined()
  })

  it('returns empty results for non-existent category', async () => {
    const filtered = await queryStats(FROM, TO, 'does-not-exist')
    expect(filtered.meta.totalJobs).toBe(0)
    expect(filtered.byTech).toHaveLength(0)
  })
})
