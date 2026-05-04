import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { queryJobs, upsertJob } from '../../src/db/jobs'
import sql from '../../src/db/client'

// Seed jobs — deterministic sourceIds so tests are idempotent
const SEEDS = [
  {
    title: 'Senior Software Engineer',
    company: 'Acme',
    cities: ['Sydney'],
    category: 'software-engineer',
    level: 'senior',
    techStack: ['TypeScript', 'React'],
    source: 'seek' as const,
    sourceId: 'test-qj-001',
    url: 'https://seek.com.au/job/001',
    description: '',
    classifiedBy: 'keyword' as const,
    llmConfidence: null,
    postedAt: new Date(),
  },
  {
    title: 'Junior Data Analyst',
    company: 'DataCo',
    cities: ['Melbourne'],
    category: 'data-analyst',
    level: 'junior',
    techStack: ['Python', 'SQL'],
    source: 'linkedin' as const,
    sourceId: 'test-qj-002',
    url: 'https://linkedin.com/jobs/view/002',
    description: '',
    classifiedBy: 'keyword' as const,
    llmConfidence: null,
    postedAt: new Date(),
  },
  {
    title: 'Mid Backend Developer',
    company: 'BackendInc',
    cities: ['Brisbane'],
    category: 'backend-developer',
    level: 'mid',
    techStack: ['Go', 'PostgreSQL'],
    source: 'seek' as const,
    sourceId: 'test-qj-003',
    url: 'https://seek.com.au/job/003',
    description: '',
    classifiedBy: 'keyword' as const,
    llmConfidence: null,
    postedAt: new Date(),
  },
  {
    title: 'Senior Data Analyst',
    company: 'AnalyticsCo',
    cities: ['Sydney'],
    category: 'data-analyst',
    level: 'senior',
    techStack: ['Python', 'TypeScript'],
    source: 'seek' as const,
    sourceId: 'test-qj-004',
    url: 'https://seek.com.au/job/004',
    description: '',
    classifiedBy: 'keyword' as const,
    llmConfidence: null,
    postedAt: new Date(),
  },
]

beforeAll(async () => {
  for (const job of SEEDS) await upsertJob(job)
})

afterAll(async () => {
  await sql`
    DELETE FROM jobs WHERE id IN (
      SELECT job_id FROM job_listings WHERE source_id LIKE 'test-qj-%'
    )
  `
  await sql.end()
})

describe('queryJobs', () => {
  it('returns all jobs with no filters', async () => {
    const { data, total } = await queryJobs({})
    expect(total).toBeGreaterThanOrEqual(4)
    expect(data.length).toBeGreaterThan(0)
    const first = data[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('title')
    expect(first).toHaveProperty('company')
    expect(first).toHaveProperty('category')
    expect(first).toHaveProperty('level')
    expect(Array.isArray(first.cities)).toBe(true)
    expect(Array.isArray(first.tech_stack)).toBe(true)
    expect(Array.isArray(first.listings)).toBe(true)
  })

  it('filters by category', async () => {
    const { data, total } = await queryJobs({ category: 'data-analyst' })
    expect(total).toBeGreaterThanOrEqual(2)
    data.forEach(j => expect(j.category).toBe('data-analyst'))
  })

  it('filters by single level', async () => {
    const { data, total } = await queryJobs({ levels: ['senior'] })
    expect(total).toBeGreaterThanOrEqual(2)
    data.forEach(j => expect(j.level).toBe('senior'))
  })

  it('filters by multiple levels', async () => {
    const { data } = await queryJobs({ levels: ['senior', 'junior'] })
    data.forEach(j => expect(['senior', 'junior']).toContain(j.level))
  })

  it('empty levels array returns all jobs', async () => {
    const { total: allTotal } = await queryJobs({})
    const { total: emptyLevelTotal } = await queryJobs({ levels: [] })
    expect(emptyLevelTotal).toBe(allTotal)
  })

  it('filters by city', async () => {
    const { data, total } = await queryJobs({ city: 'Sydney' })
    expect(total).toBeGreaterThanOrEqual(2)
    data.forEach(j => expect(j.cities).toContain('Sydney'))
  })

  it('filters by techs', async () => {
    const { data, total } = await queryJobs({ techs: ['Python'] })
    expect(total).toBeGreaterThanOrEqual(2)
    data.forEach(j => expect(j.tech_stack).toContain('Python'))
  })

  it('filters by multiple techs returns jobs with any of them', async () => {
    const { total } = await queryJobs({ techs: ['TypeScript', 'Go'] })
    expect(total).toBeGreaterThanOrEqual(3)
  })

  it('combines category and level filters', async () => {
    const { data, total } = await queryJobs({ category: 'data-analyst', levels: ['senior'] })
    expect(total).toBeGreaterThanOrEqual(1)
    data.forEach(j => {
      expect(j.category).toBe('data-analyst')
      expect(j.level).toBe('senior')
    })
  })

  it('paginates correctly', async () => {
    const { data: page1 } = await queryJobs({ page: 1, limit: 2 })
    const { data: page2 } = await queryJobs({ page: 2, limit: 2 })
    expect(page1.length).toBe(2)
    expect(page2.length).toBeGreaterThanOrEqual(1)
    const ids1 = page1.map(j => j.id)
    const ids2 = page2.map(j => j.id)
    ids2.forEach(id => expect(ids1).not.toContain(id))
  })

  it('returns empty data for non-existent category', async () => {
    const { data, total } = await queryJobs({ category: 'does-not-exist' })
    expect(total).toBe(0)
    expect(data).toHaveLength(0)
  })

  it('returns listings with source and url', async () => {
    const { data } = await queryJobs({ category: 'software-engineer' })
    const job = data.find(j => j.listings.length > 0)
    expect(job).toBeDefined()
    expect(job!.listings[0]).toHaveProperty('source')
    expect(job!.listings[0]).toHaveProperty('url')
    expect(job!.listings[0]).toHaveProperty('posted_at')
  })
})
