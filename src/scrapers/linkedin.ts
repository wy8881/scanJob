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
    const datetime = $(el).find('time').attr('datetime')
    const postedAt = datetime ? new Date(datetime) : new Date()

    if (!title || !sourceId) return

    const cities = location
      ? location.split(',').map(s => s.trim()).filter(Boolean)
      : []

    jobs.push({
      title,
      company,
      cities,
      description: '',
      url,
      sourceId,
      source: 'linkedin',
      postedAt,
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
        await new Promise(r => setTimeout(r, 1500))
      } catch (err) {
        console.error(`LinkedIn scrape failed for "${keyword}" at offset ${start}:`, err)
        break
      }
    }
  }

  const seen = new Set<string>()
  return all.filter(job => {
    if (seen.has(job.sourceId)) return false
    seen.add(job.sourceId)
    return true
  })
}
