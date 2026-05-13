import { fetchLinkedInDescription, fetchPage } from './linkedin'
import { extractTechStack } from '../enrichment/keywords'

// Fetch one page of listings to get real job IDs
console.log('Fetching LinkedIn listings...')
const jobs = await fetchPage('software engineer', 0, 1)
console.log(`Got ${jobs.length} jobs\n`)

// Test description fetch on first 3 jobs
for (const job of jobs.slice(0, 3)) {
  console.log(`--- ${job.title} @ ${job.company} (id: ${job.sourceId})`)
  const description = await fetchLinkedInDescription(job.sourceId)
  const techs = extractTechStack(description)
  console.log(`Description length: ${description.length} chars`)
  console.log(`Techs detected: ${techs.length ? techs.join(', ') : 'none'}`)
  console.log(`Preview: ${description.slice(0, 300).replace(/\n+/g, ' ')}\n`)
  await new Promise(r => setTimeout(r, 1000))
}
