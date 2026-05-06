import { describe, it, expect } from 'bun:test'
import { scrapeSeekCategory } from '../../src/scrapers/seek'

describe('Seek scraper', () => {
  it('captures correct data from first category', async () => {
    const jobs = await scrapeSeekCategory('software-engineer-jobs', 1, 1)

    console.log(`\nTotal jobs scraped: ${jobs.length}`)

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
    expect(first.url).toContain('seek.com.au')
    expect(first.source).toBe('seek')
    expect(first.postedAt).toBeInstanceOf(Date)
  }, 60000)
})
