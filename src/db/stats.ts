import sql from './client'

export interface StatsResult {
  meta: { totalJobs: number; earliestJobDate: string | null }
  byCategory: { category: string; count: number }[]
  byLevel: { level: string; count: number }[]
  byTech: { tech: string; count: number }[]
  byCompany: { company: string; count: number }[]
  byDay: { date: string; count: number }[]
}

export async function queryStats(from: Date, to: Date, category?: string): Promise<StatsResult> {
  const cf = category ? sql`AND category = ${category}` : sql``
  const cfJ = category ? sql`AND j.category = ${category}` : sql``

  const [meta, byCategory, byLevel, byTech, byCompany, byDay] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS "totalJobs", MIN(posted_at)::text AS "earliestJobDate"
      FROM jobs
      WHERE posted_at >= ${from} AND posted_at <= ${to} ${cf}
    `,
    sql`
      SELECT category, COUNT(*)::int AS count
      FROM jobs
      WHERE posted_at >= ${from} AND posted_at <= ${to} AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC
    `,
    sql`
      SELECT level, COUNT(*)::int AS count
      FROM jobs
      WHERE posted_at >= ${from} AND posted_at <= ${to} AND level IS NOT NULL ${cf}
      GROUP BY level ORDER BY count DESC
    `,
    sql`
      SELECT t.name AS tech, COUNT(*)::int AS count
      FROM job_technologies jt
      JOIN technologies t ON t.id = jt.tech_id
      JOIN jobs j ON j.id = jt.job_id
      WHERE j.posted_at >= ${from} AND j.posted_at <= ${to} ${cfJ}
      GROUP BY t.name ORDER BY count DESC LIMIT 10
    `,
    sql`
      SELECT company, COUNT(*)::int AS count
      FROM jobs
      WHERE posted_at >= ${from} AND posted_at <= ${to} AND company IS NOT NULL ${cf}
      GROUP BY company ORDER BY count DESC LIMIT 10
    `,
    sql`
      SELECT DATE(posted_at)::text AS date, COUNT(*)::int AS count
      FROM jobs
      WHERE posted_at >= ${from} AND posted_at <= ${to} ${cf}
      GROUP BY DATE(posted_at) ORDER BY date ASC
    `,
  ])

  return {
    meta: {
      totalJobs: meta[0]?.totalJobs ?? 0,
      earliestJobDate: meta[0]?.earliestJobDate ?? null,
    },
    byCategory: byCategory as { category: string; count: number }[],
    byLevel: byLevel as { level: string; count: number }[],
    byTech: byTech as { tech: string; count: number }[],
    byCompany: byCompany as { company: string; count: number }[],
    byDay: byDay as { date: string; count: number }[],
  }
}
