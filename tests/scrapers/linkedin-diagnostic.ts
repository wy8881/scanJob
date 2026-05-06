/**
 * Diagnostic script — run with: bun tests/scrapers/linkedin-diagnostic.ts
 *
 * Prints every URL the scraper will hit so you can verify counts in a browser,
 * then runs the scrape and reports per-keyword results.
 */

import { scrapeLinkedIn } from '../../src/scrapers/linkedin'

const SEARCH_TERMS = [
  'software engineer', 'backend developer', 'web developer',
  'data analyst', 'IT support', 'cyber security', 'QA engineer',
]

const TPR = 1 * 24 * 3600  // 1 day in seconds

console.log('=== URLs to verify manually in browser ===')
for (const keyword of SEARCH_TERMS) {
  console.log(`\n"${keyword}":`)
  for (let start = 0; start < 75; start += 25) {
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=Australia&f_TPR=r${TPR}&start=${start}`
    console.log(`  offset ${start}: ${url}`)
  }
}

console.log('\n=== Running scrape (past 24h) ===\n')
const startTime = Date.now()
const jobs = await scrapeLinkedIn(1)
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

console.log(`\n=== Results (${elapsed}s) ===`)
console.log(`Total unique jobs: ${jobs.length}`)

const byKeyword: Record<string, typeof jobs> = {}
for (const job of jobs) {
  const key = job.title.toLowerCase().split(' ').slice(0, 2).join(' ')
  byKeyword[key] = byKeyword[key] ?? []
  byKeyword[key].push(job)
}

for (const [keyword, list] of Object.entries(byKeyword)) {
  console.log(`\n"${keyword}": ${list.length} jobs`)
  for (const j of list.slice(0, 3)) {
    console.log(`  - [${j.sourceId}] ${j.title} @ ${j.company ?? '?'}`)
    console.log(`    ${j.url}`)
  }
  if (list.length > 3) console.log(`  ... and ${list.length - 3} more`)
}
