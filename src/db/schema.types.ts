// Auto-generated from DB schema — do not edit by hand

export type CitiesRow = {
  id: number
  name: string
}

export type CompaniesRow = {
  id: number
  name: string
  type: string | null
  size: string | null
  industry: string | null
  llm_confidence: number | null
  enriched_at: Date | null
}

export type CorrectionsRow = {
  id: number
  entity_type: string
  entity_id: number
  field: string
  old_value: string | null
  new_value: string
  note: string | null
  corrected_at: Date | null
}

export type JobCitiesRow = {
  job_id: number
  city_id: number
}

export type JobListingsRow = {
  id: number
  job_id: number
  source: string
  source_id: string
  url: string | null
  scraped_at: Date | null
}

export type JobTechnologiesRow = {
  job_id: number
  tech_id: number
}

export type JobsRow = {
  id: number
  title: string
  company: string | null
  company_id: number | null
  normalized_title: string
  normalized_company: string
  category: string | null
  level: string | null
  description: string | null
  classified_by: string | null
  llm_confidence: number | null
  posted_at: Date | null
}

export type ScrapeRunsRow = {
  id: number
  source: string
  status: string
  jobs_found: number | null
  started_at: Date | null
  finished_at: Date | null
}

export type TechnologiesRow = {
  id: number
  name: string
}

