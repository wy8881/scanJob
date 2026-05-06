import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { upsertJob, getJobById } from "../../src/db/jobs";
import sql from "../../src/db/client";

const BASE = {
  description: "",
  classifiedBy: "keyword" as const,
  llmConfidence: null,
  postedAt: new Date(),
};

const JOB_A = {
  ...BASE,
  title: "Senior TypeScript Engineer",
  company: "AlphaCorp",
  cities: ["Sydney"],
  category: "software-engineer",
  level: "senior",
  techStack: ["TypeScript", "React"],
  source: "seek" as const,
  sourceId: "test-uj-001",
  url: "https://seek.com.au/job/uj001",
};

const JOB_A_LINKEDIN = {
  ...JOB_A,
  source: "linkedin" as const,
  sourceId: "test-uj-001-li",
  url: "https://linkedin.com/jobs/uj001",
};

const JOB_B = {
  ...BASE,
  title: "Junior Python Developer",
  company: "BetaCo",
  cities: ["Melbourne", "Brisbane"],
  category: "backend-developer",
  level: "junior",
  techStack: ["Python", "Django", "PostgreSQL"],
  source: "seek" as const,
  sourceId: "test-uj-002",
  url: "https://seek.com.au/job/uj002",
};

let jobAId: number;
let jobBId: number;

beforeAll(async () => {
  const a = await upsertJob(JOB_A);
  const b = await upsertJob(JOB_B);
  if (!a || !b)
    throw new Error(
      "Seed failed — listings may already exist from a prior run",
    );
  jobAId = a;
  jobBId = b;
});

afterAll(async () => {
  await sql`
    DELETE FROM jobs WHERE id IN (
      SELECT job_id FROM job_listings WHERE source_id LIKE 'test-uj-%'
    )
  `;
});

describe("upsertJob", () => {
  it("returns a positive job id on first insert", () => {
    expect(jobAId).toBeGreaterThan(0);
    expect(jobBId).toBeGreaterThan(0);
  });

  it("stored job has correct scalar fields", async () => {
    const job = await getJobById(jobAId);
    expect(job).not.toBeNull();
    expect(job!.title).toBe(JOB_A.title);
    expect(job!.company).toBe(JOB_A.company);
    expect(job!.category).toBe(JOB_A.category);
    expect(job!.level).toBe(JOB_A.level);
  });

  it("links cities to the job", async () => {
    const job = await getJobById(jobBId);
    expect(job).not.toBeNull();
    expect(job!.cities).toContain("Melbourne");
    expect(job!.cities).toContain("Brisbane");
  });

  it("links tech stack to the job", async () => {
    const job = await getJobById(jobBId);
    expect(job).not.toBeNull();
    expect(job!.tech_stack).toContain("Python");
    expect(job!.tech_stack).toContain("Django");
    expect(job!.tech_stack).toContain("PostgreSQL");
  });

  it("returns null when same source+sourceId is inserted again", async () => {
    // JOB_A was already inserted in beforeAll — listing ON CONFLICT DO NOTHING
    const id = await upsertJob(JOB_A);
    expect(id).toBeNull();
  });

  it("canonical job id is stable when re-inserting same normalized title+company+level", async () => {
    // Even though listing is skipped, the canonical job row is the same
    const [row] = await sql`
      SELECT id FROM jobs
      WHERE normalized_title = 'senior typescript engineer'
        AND normalized_company = 'alphacorp'
        AND level = 'senior'
    `;
    expect(row).not.toBeNull();
    expect(row!.id).toBe(jobAId);
  });

  it("adds a second listing when same job appears on a different source", async () => {
    const idLinkedIn = await upsertJob(JOB_A_LINKEDIN);
    // Same canonical job → same job id
    expect(idLinkedIn).toBe(jobAId);

    const job = await getJobById(jobAId);
    expect(job).not.toBeNull();
    const sources = job!.listings.map((l: { source: string }) => l.source);
    expect(sources).toContain("seek");
    expect(sources).toContain("linkedin");
  });

  it("two different jobs get different ids", () => {
    expect(jobAId).not.toBe(jobBId);
  });
});
