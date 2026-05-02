export type RawJob = {
  title: string
  company: string | null
  cities: string[]
  salaryText: string | null
  description: string
  url: string
  sourceId: string
  source: 'seek' | 'linkedin'
  postedAt: Date | null
}

export type EnrichedJob = {
  title: string
  company: string | null
  cities: string[]
  category: string
  level: string
  salaryMin: number | null
  salaryMax: number | null
  techStack: string[]
  source: 'seek' | 'linkedin'
  sourceId: string
  url: string
  description: string
  classifiedBy: 'keyword' | 'llm'
  llmConfidence: number | null
  postedAt: Date | null
}

export type CompanyInfo = {
  id: number
  name: string
  type: string | null
  size: string | null
  industry: string | null
}

export type JobFilters = {
  category?: string
  levels?: string[]
  city?: string
  techs?: string[]
  salaryMin?: number
  page?: number
  limit?: number
}
