import { describe, it, expect } from 'bun:test'
import { extractTechStack, detectLevel, detectCategory } from '../../src/enrichment/keywords'

describe('detectLevel', () => {
  it('detects senior keywords', () => {
    expect(detectLevel('Senior Software Engineer')).toBe('senior')
    expect(detectLevel('Lead Developer')).toBe('senior')
    expect(detectLevel('Principal Engineer')).toBe('senior')
    expect(detectLevel('Staff Engineer')).toBe('senior')
    expect(detectLevel('Head of Engineering')).toBe('senior')
    expect(detectLevel('Sr. Developer')).toBe('senior')
  })

  it('detects junior keywords', () => {
    expect(detectLevel('Junior Developer')).toBe('junior')
    expect(detectLevel('Entry Level Software Engineer')).toBe('junior')
    expect(detectLevel('Entry-Level Engineer')).toBe('junior')
    expect(detectLevel('Jr. Developer')).toBe('junior')
  })

  it('detects graduate keywords', () => {
    expect(detectLevel('Graduate Software Engineer')).toBe('graduate')
    expect(detectLevel('New Grad Engineer')).toBe('graduate')
  })

  it('returns null for ambiguous titles', () => {
    expect(detectLevel('Software Engineer')).toBeNull()
    expect(detectLevel('Backend Developer')).toBeNull()
    expect(detectLevel('')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(detectLevel('SENIOR Engineer')).toBe('senior')
    expect(detectLevel('JUNIOR Developer')).toBe('junior')
    expect(detectLevel('GRADUATE')).toBe('graduate')
  })
})

describe('detectCategory', () => {
  it('detects software-engineer', () => {
    expect(detectCategory('Software Engineer')).toBe('software-engineer')
    expect(detectCategory('Software Developer')).toBe('software-engineer')
  })

  it('detects backend-developer', () => {
    expect(detectCategory('Backend Developer')).toBe('backend-developer')
    expect(detectCategory('Back-End Engineer')).toBe('backend-developer')
    expect(detectCategory('API Developer')).toBe('backend-developer')
  })

  it('detects web-development', () => {
    expect(detectCategory('Web Developer')).toBe('web-development')
    expect(detectCategory('Frontend Engineer')).toBe('web-development')
    expect(detectCategory('Front-End Developer')).toBe('web-development')
    expect(detectCategory('UI Developer')).toBe('web-development')
  })

  it('detects data-analyst', () => {
    expect(detectCategory('Data Analyst')).toBe('data-analyst')
    expect(detectCategory('Data Scientist')).toBe('data-analyst')
    expect(detectCategory('Business Analyst')).toBe('data-analyst')
    expect(detectCategory('BI Developer')).toBe('data-analyst')
  })

  it('detects it-support', () => {
    expect(detectCategory('IT Support Specialist')).toBe('it-support')
    expect(detectCategory('Helpdesk Technician')).toBe('it-support')
    expect(detectCategory('Help Desk Analyst')).toBe('it-support')
    expect(detectCategory('Service Desk Engineer')).toBe('it-support')
    expect(detectCategory('Sysadmin')).toBe('it-support')
  })

  it('detects cyber-security', () => {
    expect(detectCategory('Cyber Security Analyst')).toBe('cyber-security')
    expect(detectCategory('Security Engineer')).toBe('cyber-security')
    expect(detectCategory('SOC Analyst')).toBe('cyber-security')
    expect(detectCategory('Penetration Tester')).toBe('cyber-security')
    expect(detectCategory('InfoSec Engineer')).toBe('cyber-security')
  })

  it('detects qa-tester', () => {
    expect(detectCategory('QA Engineer')).toBe('qa-tester')
    expect(detectCategory('Quality Assurance Analyst')).toBe('qa-tester')
    expect(detectCategory('Test Engineer')).toBe('qa-tester')
    expect(detectCategory('SDET')).toBe('qa-tester')
    expect(detectCategory('Automation Engineer')).toBe('qa-tester')
  })

  it('returns null for ambiguous titles', () => {
    expect(detectCategory('Project Manager')).toBeNull()
    expect(detectCategory('Digital Transformation Specialist')).toBeNull()
    expect(detectCategory('')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(detectCategory('SOFTWARE ENGINEER')).toBe('software-engineer')
    expect(detectCategory('qa engineer')).toBe('qa-tester')
    expect(detectCategory('CYBER Security')).toBe('cyber-security')
  })
})

describe('extractTechStack', () => {
  it('extracts multiple known techs from description', () => {
    const result = extractTechStack('We use React TypeScript and PostgreSQL')
    expect(result).toContain('React')
    expect(result).toContain('TypeScript')
    expect(result).toContain('PostgreSQL')
  })

  it('extracts techs with spaces like Node.js', () => {
    expect(extractTechStack('Experience with Node.js required')).toContain('Node.js')
  })

  it('extracts React from description containing React', () => {
    const result = extractTechStack('React and React experience needed')
    expect(result).toContain('React')
  })

  it('extracts cloud providers', () => {
    const result = extractTechStack('Deployed on AWS and Azure')
    expect(result).toContain('AWS')
    expect(result).toContain('Azure')
  })

  it('matches exact case of tech keywords', () => {
    expect(extractTechStack('experience with Python and Go')).toContain('Python')
    expect(extractTechStack('experience with Python and Go')).toContain('Go')
  })

  it('returns empty array when no techs found', () => {
    expect(extractTechStack('Great communication skills required.')).toEqual([])
    expect(extractTechStack('')).toEqual([])
  })

  it('does not return duplicates', () => {
    const result = extractTechStack('React and React components and react hooks')
    const reactCount = result.filter(t => t === 'React').length
    expect(reactCount).toBe(1)
  })
})
