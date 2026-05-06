import type { RawJob, EnrichedJob } from '../types'
import { extractTechStack, detectLevel, detectCategory } from './keywords'
import { normalizeCity } from './cities'

export async function enrich(raw: RawJob): Promise<EnrichedJob> {
  const techStack = extractTechStack(raw.description)
  const level = detectLevel(raw.title) ?? 'mid'
  const category = detectCategory(raw.title) ?? 'other'
  const cities = raw.cities.map(normalizeCity)

  return {
    ...raw,
    cities,
    category,
    level,
    techStack,
    classifiedBy: 'keyword',
    llmConfidence: null,
  }
}
