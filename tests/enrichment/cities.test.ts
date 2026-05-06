import { describe, it, expect } from 'bun:test'
import { normalizeCity } from '../../src/enrichment/cities'

describe('normalizeCity', () => {
  it('returns major metro city names exactly', () => {
    expect(normalizeCity('Sydney')).toBe('Sydney')
    expect(normalizeCity('Melbourne')).toBe('Melbourne')
    expect(normalizeCity('Brisbane')).toBe('Brisbane')
    expect(normalizeCity('Perth')).toBe('Perth')
    expect(normalizeCity('Adelaide')).toBe('Adelaide')
  })

  it('is case-insensitive', () => {
    expect(normalizeCity('sydney')).toBe('Sydney')
    expect(normalizeCity('MELBOURNE')).toBe('Melbourne')
    expect(normalizeCity('bRiSbAnE')).toBe('Brisbane')
  })

  it('extracts city from a longer location string', () => {
    expect(normalizeCity('Sydney, New South Wales')).toBe('Sydney')
    expect(normalizeCity('Melbourne VIC')).toBe('Melbourne')
    expect(normalizeCity('Brisbane, QLD, Australia')).toBe('Brisbane')
  })

  it('handles regional cities', () => {
    expect(normalizeCity('Gold Coast')).toBe('Gold Coast')
    expect(normalizeCity('Wollongong')).toBe('Wollongong')
    expect(normalizeCity('Geelong')).toBe('Geelong')
    expect(normalizeCity('Newcastle')).toBe('Newcastle')
  })

  it('returns Australia for unknown locations', () => {
    expect(normalizeCity('Remote')).toBe('Australia')
    expect(normalizeCity('Australia')).toBe('Australia')
    expect(normalizeCity('')).toBe('Australia')
    expect(normalizeCity('New Zealand')).toBe('Australia')
  })

  it('returns Australia for generic location strings', () => {
    expect(normalizeCity('Hybrid')).toBe('Australia')
    expect(normalizeCity('Work from Home')).toBe('Australia')
  })
})
