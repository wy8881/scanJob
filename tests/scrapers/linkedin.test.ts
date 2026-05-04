import { describe, it, expect } from 'bun:test'
import { fetchPage } from '../../src/scrapers/linkedin'

describe('LinkedIn scraper', () => {
  it('captures correct data from first page', async () => {
    const jobs = await fetchPage('software engineer', 0, 1)

    console.log(`\nTotal jobs on first page: ${jobs.length}`)

    expect(jobs.length).toBeGreaterThan(0)

    const first = jobs[0]
    console.log('\n=== First job ===')
    console.log(`title:     ${first.title}`)
    console.log(`company:   ${first.company}`)
    console.log(`cities:    ${first.cities.join(', ')}`)
    console.log(`sourceId:  ${first.sourceId}`)
    console.log(`url:       ${first.url}`)
    console.log(`postedAt:  ${first.postedAt.toISOString()}`)
    console.log(`source:    ${first.source}`)

    expect(first.title).toBeTruthy()
    expect(first.sourceId).toBeTruthy()
    expect(first.url).toContain('linkedin.com')
    expect(first.source).toBe('linkedin')
    expect(first.postedAt).toBeInstanceOf(Date)
  }, 30000)
})
