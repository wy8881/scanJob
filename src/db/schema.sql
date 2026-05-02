CREATE TABLE IF NOT EXISTS companies (
  id             SERIAL PRIMARY KEY,
  name           TEXT UNIQUE NOT NULL,
  type           TEXT,
  size           TEXT,
  industry       TEXT,
  llm_confidence FLOAT,
  enriched_at    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id               SERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  company          TEXT,
  company_id       INTEGER REFERENCES companies(id),
  category         TEXT,
  level            TEXT,
  salary_min       INTEGER,
  salary_max       INTEGER,
  source           TEXT NOT NULL,
  source_id        TEXT,
  url              TEXT,
  description      TEXT,
  classified_by    TEXT,
  llm_confidence   FLOAT,
  posted_at        TIMESTAMP,
  scraped_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(source, source_id)
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
