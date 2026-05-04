import { scrapeLinkedIn } from './linkedin'
import { scrapeSeek } from './seek'
import { enrich } from '../enrichment'
import { upsertJob, startScrapeRun, finishScrapeRun, failScrapeRun } from '../db/jobs'

export async function runScrape(daterange = 3): Promise<void> {
  await runSource('linkedin', scrapeLinkedIn)
  await runSource('seek', () => scrapeSeek(daterange))
}

async function runSource(
  source: string,
  scraper: () => Promise<Awaited<ReturnType<typeof scrapeLinkedIn>>>
): Promise<void> {
  const runId = await startScrapeRun(source)
  let saved = 0

  try {
    const raw = await scraper()

    for (const job of raw) {
      const enriched = await enrich(job)
      const id = await upsertJob(enriched)
      if (id !== null) saved++
    }

    await finishScrapeRun(runId, saved)
    console.log(`[${source}] done — ${saved} new jobs saved (${raw.length} scraped)`)
  } catch (err) {
    await failScrapeRun(runId)
    console.error(`[${source}] scrape failed:`, err)
  }
}
