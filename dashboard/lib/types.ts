export interface StatsResponse {
  meta: {
    totalJobs: number
    earliestJobDate: string | null
  }
  byCategory: { category: string; count: number }[]
  byLevel: { level: string; count: number }[]
  byTech: { tech: string; count: number }[]
  byCompany: { company: string; count: number }[]
  byDay: { date: string; count: number }[]
}

export type TimeRange = 'month' | '3months' | '6months' | 'year'
