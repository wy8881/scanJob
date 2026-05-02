const TECH_KEYWORDS = [
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript',
  'Python', 'Java', 'Go', 'Rust', 'C#', 'PHP', 'Ruby',
  'Node.js', 'Express', 'Django', 'FastAPI', 'Spring',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
  'React Native', 'Flutter', 'Swift', 'Kotlin',
  'Git', 'Linux', 'Bash', 'PowerShell',
]

const LEVEL_KEYWORDS: Record<string, string[]> = {
  graduate: ['graduate', 'grad role', 'new grad'],
  junior:   ['junior', 'entry level', 'entry-level', 'jr.', 'jr '],
  senior:   ['senior', 'lead', 'principal', 'staff', 'head of', 'sr.', 'sr '],
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'software-engineer':  ['software engineer', 'software developer'],
  'backend-developer':  ['backend', 'back-end', 'back end', 'api developer'],
  'web-development':    ['web developer', 'frontend', 'front-end', 'ui developer'],
  'data-analyst':       ['data analyst', 'data scientist', 'business analyst', 'bi developer'],
  'it-support':         ['it support', 'helpdesk', 'help desk', 'service desk', 'sysadmin', 'systems administrator'],
  'cyber-security':     ['cyber', 'security engineer', 'penetration', 'infosec', 'soc analyst'],
  'qa-tester':          ['qa engineer', 'quality assurance', 'test engineer', 'tester', 'sdet', 'automation engineer'],
}

export function extractTechStack(description: string): string[] {
  const lower = description.toLowerCase()
  return TECH_KEYWORDS.filter(tech => lower.includes(tech.toLowerCase()))
}

export function detectLevel(title: string): string | null {
  const lower = title.toLowerCase()
  for (const [level, keywords] of Object.entries(LEVEL_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return level
  }
  return null
}

export function detectCategory(title: string): string | null {
  const lower = title.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category
  }
  return null
}
