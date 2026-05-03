import type { RawJob, EnrichedJob } from '../types'
import { extractTechStack, detectLevel, detectCategory } from './keywords'

export async function enrich(raw: RawJob): Promise<EnrichedJob> {
  const techStack = extractTechStack(raw.description)
  const level = detectLevel(raw.title) ?? 'mid'
  const category = detectCategory(raw.title) ?? 'other'

  return {
    ...raw,
    category,
    level,
    techStack,
    classifiedBy: 'keyword',
    llmConfidence: null,
  }
}
