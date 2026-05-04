import { chromium } from 'playwright'
import type { RawJob } from '../types'

function parseRelativeDate(text: string): Date {
  const match = text.match(/^(\d+)(m|h|d)\s*ago$/i)
  if (!match) return new Date()
  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()
  const ms = unit === 'm' ? value * 60 * 1000
           : unit === 'h' ? value * 60 * 60 * 1000
           : value * 24 * 60 * 60 * 1000
  return new Date(Date.now() - ms)
}

const CATEGORY_URLS: Record<string, string> = {
  'software-engineer': 'software-engineer-jobs',
  'backend-developer': 'backend-developer-jobs',
  'web-development':   'web-developer-jobs',
  'data-analyst':      'data-analyst-jobs',
  'it-support':        'it-support-jobs',
  'cyber-security':    'cyber-security-jobs',
  'qa-tester':         'testing-qa-jobs',
}

type BrowserPage = Awaited<ReturnType<typeof chromium.launch>>['contexts'][0]['pages'][0]

async function scrapeCategory(page: BrowserPage, categorySlug: string): Promise<RawJob[]> {
  const jobs: RawJob[] = []

  for (let pageNum = 1; pageNum <= 5; pageNum++) {
    const url = `https://www.seek.com.au/${categorySlug}/in-Australia?page=${pageNum}`
    console.log(`  [seek] GET ${url}`)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 1500))

    await page.waitForSelector('[data-testid="job-card"], [data-testid="no-results"]', {
      timeout: 15000,
    }).catch(() => {})

    const pageJobs = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="job-card"]')
      return Array.from(cards).map(card => {
        const titleEl = card.querySelector<HTMLAnchorElement>('[data-testid="job-card-title"]')
        const companyEl = card.querySelector('[data-automation="jobCompany"]')
        const locationEl = card.querySelector('[data-automation="jobCardLocation"]')

        const href = titleEl?.getAttribute('href') ?? ''
        const sourceId = href.match(/\/job\/(\d+)/)?.[1] ?? href

        const dateEl = card.querySelector('[data-automation="jobListingDate"]')
        const dateText = dateEl?.textContent?.trim() ?? ''

        return {
          title: titleEl?.textContent?.trim() ?? '',
          company: companyEl?.textContent?.trim() ?? null,
          locationText: locationEl?.textContent?.trim() ?? '',
          url: href ? `https://www.seek.com.au${href.split('#')[0]}` : '',
          sourceId,
          dateText,
        }
      })
    })

    console.log(`  [seek] ${categorySlug} page ${pageNum}: ${pageJobs.length} cards`)
    if (pageJobs.length === 0) break

    for (const j of pageJobs) {
      if (!j.title || !j.sourceId) continue
      jobs.push({
        title: j.title,
        company: j.company,
        cities: j.locationText ? [j.locationText.split(',')[0].trim()] : [],
        description: '',
        url: j.url,
        sourceId: j.sourceId,
        source: 'seek',
        postedAt: parseRelativeDate(j.dateText),
      })
    }

    await new Promise(r => setTimeout(r, 1000))
  }

  return jobs
}

export async function scrapeSeek(): Promise<RawJob[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-AU',
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      'Accept-Language': 'en-AU,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  })

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
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
