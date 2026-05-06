export type RawJob = {
  title: string
  company: string | null
  cities: string[]
  description: string
  url: string
  sourceId: string
  source: 'seek' | 'linkedin'
  postedAt: Date
}

export type EnrichedJob = {
  title: string
  company: string | null
  cities: string[]
  category: string
  level: string
  techStack: string[]
  source: 'seek' | 'linkedin'
  sourceId: string
  url: string
  description: string
  classifiedBy: 'keyword' | 'llm'
  llmConfidence: number | null
  postedAt: Date
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
  page?: number
  limit?: number
}
