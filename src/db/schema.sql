-- Drop in reverse FK order then recreate clean.
-- Use ALTER TABLE migrations only once real data exists in production.
DROP TABLE IF EXISTS corrections CASCADE;
DROP TABLE IF EXISTS scrape_runs CASCADE;
DROP TABLE IF EXISTS job_technologies CASCADE;
DROP TABLE IF EXISTS job_cities CASCADE;
DROP TABLE IF EXISTS job_listings CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS technologies CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

CREATE TABLE IF NOT EXISTS companies (
  id             SERIAL PRIMARY KEY,
  name           TEXT UNIQUE NOT NULL,
  type           TEXT,
  size           TEXT,
  industry       TEXT,
  llm_confidence FLOAT,
  enriched_at    TIMESTAMP
);

-- Canonical job: one row per unique role, deduplicated across sources.
CREATE TABLE IF NOT EXISTS jobs (
  id                 SERIAL PRIMARY KEY,
  title              TEXT NOT NULL,
  company            TEXT,
  company_id         INTEGER REFERENCES companies(id),
  normalized_title   TEXT NOT NULL,
  normalized_company TEXT NOT NULL,
  category           TEXT,
  level              TEXT,
  salary_min         INTEGER,
  salary_max         INTEGER,
  description        TEXT,
  classified_by      TEXT,
  llm_confidence     FLOAT
);

CREATE UNIQUE INDEX IF NOT EXISTS jobs_dedup_idx ON jobs (normalized_title, normalized_company, level);

-- Where the job was found: one row per site listing.
CREATE TABLE IF NOT EXISTS job_listings (
  id         SERIAL PRIMARY KEY,
  job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  source     TEXT NOT NULL,
  source_id  TEXT NOT NULL,
  url        TEXT,
  posted_at  TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (source, source_id)
);

CREATE TABLE IF NOT EXISTS cities (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS technologies (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS job_cities (
  job_id  INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, city_id)
);

CREATE TABLE IF NOT EXISTS job_technologies (
  job_id  INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  tech_id INTEGER REFERENCES technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, tech_id)
);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id          SERIAL PRIMARY KEY,
  source      TEXT NOT NULL,
  status      TEXT NOT NULL,
  jobs_found  INTEGER DEFAULT 0,
  started_at  TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS corrections (
  id           SERIAL PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    INTEGER NOT NULL,
  field        TEXT NOT NULL,
  old_value    TEXT,
  new_value    TEXT NOT NULL,
  note         TEXT,
  corrected_at TIMESTAMP DEFAULT NOW()
);
