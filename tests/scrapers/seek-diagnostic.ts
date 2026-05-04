/**
 * Diagnostic script — run with: bun tests/scrapers/seek-diagnostic.ts
 *
 * Prints every URL the scraper will hit so you can verify counts in a browser,
 * then runs the scrape and reports per-category results.
 */

import { scrapeSeek } from '../../src/scrapers/seek'

const CATEGORY_URLS: Record<string, string> = {
  'software-engineer': 'software-engineer-jobs',
  'backend-developer': 'backend-developer-jobs',
  'web-development':   'web-developer-jobs',
  'data-analyst':      'data-analyst-jobs',
  'it-support':        'it-support-jobs',
  'cyber-security':    'cyber-security-jobs',
  'qa-tester':         'testing-qa-jobs',
}

console.log('=== URLs to verify manually in browser ===')
for (const [category, slug] of Object.entries(CATEGORY_URLS)) {
  console.log(`\n${category}:`)
  for (let p = 1; p <= 5; p++) {
    console.log(`  page ${p}: https://www.seek.com.au/${slug}/in-Australia?page=${p}`)
  }
}

console.log('\n=== Running scrape ===\n')
const start = Date.now()
const jobs = await scrapeSeek()
const elapsed = ((Date.now() - start) / 1000).toFixed(1)

console.log(`\n=== Results (${elapsed}s) ===`)
console.log(`Total unique jobs: ${jobs.length}`)

// Group by source category (inferred from URL slug)
const byCategory: Record<string, typeof jobs> = {}
for (const job of jobs) {
  const slug = new URL(job.url).pathname.split('/')[1] ?? 'unknown'
  byCategory[slug] = byCategory[slug] ?? []
  byCategory[slug].push(job)
}

for (const [slug, list] of Object.entries(byCategory)) {
  console.log(`\n${slug}: ${list.length} jobs`)
  for (const j of list.slice(0, 3)) {
    console.log(`  - [${j.sourceId}] ${j.title} @ ${j.company ?? '?'}`)
    console.log(`    ${j.url}`)
  }
  if (list.length > 3) console.log(`  ... and ${list.length - 3} more`)
}
