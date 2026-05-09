import { scrapeSeekCategory } from './seek'
import { scrapeLinkedIn } from './linkedin'
import { extractTechStack } from '../enrichment/keywords'

function printJobs(source: string, jobs: Awaited<ReturnType<typeof scrapeSeekCategory>>) {
  console.log(`\n===== ${source} (${jobs.length} jobs) =====`)
  for (const job of jobs.slice(0, 2)) {
    const techs = extractTechStack(job.description)
    console.log(`\n--- ${job.title} @ ${job.company}`)
    console.log(`Description:\n${job.description}`)
    console.log(`\nTechs detected: ${techs.length ? techs.join(', ') : 'none'}`)
  }
}

const seekJobs = await scrapeSeekCategory('software-engineer-jobs', 1, 1)
printJobs('Seek', seekJobs)

const linkedInJobs = await scrapeLinkedIn(1, 1)
printJobs('LinkedIn', linkedInJobs)
