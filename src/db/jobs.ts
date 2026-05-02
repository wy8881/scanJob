import sql from './client'
import type { EnrichedJob, JobFilters } from '../types'

export async function startScrapeRun(source: string): Promise<number> {
  const [row] = await sql`
    INSERT INTO scrape_runs (source, status)
    VALUES (${source}, 'running')
    RETURNING id
  `
  return row.id
}

export async function finishScrapeRun(id: number, jobsFound: number): Promise<void> {
  await sql`
    UPDATE scrape_runs
    SET status = 'completed', jobs_found = ${jobsFound}, finished_at = NOW()
    WHERE id = ${id}
  `
}

export async function failScrapeRun(id: number): Promise<void> {
  await sql`
    UPDATE scrape_runs
    SET status = 'failed', finished_at = NOW()
    WHERE id = ${id}
  `
}

export async function upsertJob(job: EnrichedJob): Promise<number | null> {
  return await sql.begin(async (tx) => {
    const [row] = await tx`
      INSERT INTO jobs (
        title, company, category, level,
        salary_min, salary_max, source, source_id,
        url, description, classified_by, llm_confidence, posted_at
      ) VALUES (
        ${job.title}, ${job.company}, ${job.category}, ${job.level},
        ${job.salaryMin}, ${job.salaryMax}, ${job.source}, ${job.sourceId},
        ${job.url}, ${job.description}, ${job.classifiedBy}, ${job.llmConfidence},
        ${job.postedAt}
      )
      ON CONFLICT (source, source_id) DO NOTHING
      RETURNING id
    `

    if (!row) return null

    const jobId: number = row.id

    for (const cityName of job.cities) {
      const [city] = await tx`
        INSERT INTO cities (name) VALUES (${cityName})
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `
      await tx`
        INSERT INTO job_cities (job_id, city_id) VALUES (${jobId}, ${city.id})
        ON CONFLICT DO NOTHING
      `
    }

    for (const techName of job.techStack) {
      const [tech] = await tx`
        INSERT INTO technologies (name) VALUES (${techName})
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `
      await tx`
        INSERT INTO job_technologies (job_id, tech_id) VALUES (${jobId}, ${tech.id})
        ON CONFLICT DO NOTHING
      `
    }

    return jobId
  })
}

export type JobRow = {
  id: number
  title: string
  company: string | null
  category: string
  level: string
  salary_min: number | null
  salary_max: number | null
  source: string
  url: string
  posted_at: Date | null
  cities: string[]
  tech_stack: string[]
}

export async function queryJobs(filters: JobFilters): Promise<{ data: JobRow[]; total: number }> {
  const { category, levels, city, techs, salaryMin, page = 1, limit = 20 } = filters
  const offset = (page - 1) * limit

  const cf = category ? sql`AND j.category = ${category}` : sql``
  const lf = levels?.length ? sql`AND j.level = ANY(${levels})` : sql``
  const sf = salaryMin ? sql`AND j.salary_min >= ${salaryMin}` : sql``
  const cityf = city ? sql`AND j.id IN (
    SELECT jc.job_id FROM job_cities jc
    JOIN cities c ON jc.city_id = c.id WHERE c.name = ${city}
  )` : sql``
  const techf = techs?.length ? sql`AND j.id IN (
    SELECT jt.job_id FROM job_technologies jt
    JOIN technologies t ON jt.tech_id = t.id WHERE t.name = ANY(${techs})
  )` : sql``

  const data = await sql<JobRow[]>`
    SELECT j.id, j.title, j.company, j.category, j.level,
           j.salary_min, j.salary_max, j.source, j.url, j.posted_at,
           COALESCE(array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '{}') AS cities,
           COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tech_stack
    FROM jobs j
    LEFT JOIN job_cities jc ON j.id = jc.job_id
    LEFT JOIN cities c ON jc.city_id = c.id
    LEFT JOIN job_technologies jt ON j.id = jt.job_id
    LEFT JOIN technologies t ON jt.tech_id = t.id
    WHERE 1=1 ${cf} ${lf} ${sf} ${cityf} ${techf}
    GROUP BY j.id
    ORDER BY j.posted_at DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `

  const [{ count }] = await sql`
    SELECT COUNT(DISTINCT j.id) AS count
    FROM jobs j
    LEFT JOIN job_cities jc ON j.id = jc.job_id
    LEFT JOIN cities c ON jc.city_id = c.id
    LEFT JOIN job_technologies jt ON j.id = jt.job_id
    LEFT JOIN technologies t ON jt.tech_id = t.id
    WHERE 1=1 ${cf} ${lf} ${sf} ${cityf} ${techf}
  `

  return { data, total: Number(count) }
}

export async function getJobById(id: number) {
  const [job] = await sql`
    SELECT j.*,
           COALESCE(array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '{}') AS cities,
           COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tech_stack
    FROM jobs j
    LEFT JOIN job_cities jc ON j.id = jc.job_id
    LEFT JOIN cities c ON jc.city_id = c.id
    LEFT JOIN job_technologies jt ON j.id = jt.job_id
    LEFT JOIN technologies t ON jt.tech_id = t.id
    WHERE j.id = ${id}
    GROUP BY j.id
  `
  return job ?? null
}

export async function getScrapeStatus() {
  return await sql`
    SELECT source, status, jobs_found, started_at, finished_at
    FROM scrape_runs
    ORDER BY started_at DESC
    LIMIT 10
  `
}

export async function updateJobField(
  id: number,
  field: string,
  value: string,
  tx: typeof sql = sql
): Promise<void> {
  await tx`
    UPDATE jobs
    SET ${tx(field)} = ${value}, classified_by = 'human'
    WHERE id = ${id}
  `
}
