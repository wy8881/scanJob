import { describe, it, expect } from 'bun:test'
import { extractTechStack, detectLevel, detectCategory } from '../../src/enrichment/keywords'

describe('extractTechStack', () => {
  it('extracts known tech keywords from description', () => {
    const desc = 'We use React, TypeScript and PostgreSQL in our stack.'
    expect(extractTechStack(desc)).toEqual(expect.arrayContaining(['React', 'TypeScript', 'PostgreSQL']))
  })

  it('returns empty array when no known techs found', () => {
    expect(extractTechStack('Great communication skills required.')).toEqual([])
  })
})

describe('detectLevel', () => {
  it('detects graduate from title', () => {
    expect(detectLevel('Graduate Software Engineer')).toBe('graduate')
  })

  it('detects junior from title', () => {
    expect(detectLevel('Junior Developer')).toBe('junior')
  })

  it('detects senior from title', () => {
    expect(detectLevel('Senior Backend Engineer')).toBe('senior')
  })

  it('returns null for ambiguous title', () => {
    expect(detectLevel('Software Engineer')).toBeNull()
  })
})

describe('detectCategory', () => {
  it('detects software-engineer', () => {
    expect(detectCategory('Software Developer')).toBe('software-engineer')
  })

  it('detects qa-tester', () => {
    expect(detectCategory('QA Engineer')).toBe('qa-tester')
  })

  it('detects cyber-security', () => {
    expect(detectCategory('SOC Analyst')).toBe('cyber-security')
  })

  it('returns null for ambiguous title', () => {
    expect(detectCategory('Digital Transformation Specialist')).toBeNull()
  })
})
