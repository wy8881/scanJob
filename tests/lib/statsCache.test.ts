import { describe, it, expect, beforeEach } from 'bun:test'
import { getCached, setCached, clearCache } from '../../src/lib/statsCache'
import type { StatsResult } from '../../src/db/stats'

const DUMMY: StatsResult = {
  meta: { totalJobs: 5, earliestJobDate: '2026-01-01' },
  byCategory: [],
  byLevel: [],
  byTech: [],
  byCompany: [],
  byDay: [],
}

beforeEach(() => clearCache())

describe('statsCache', () => {
  it('returns null on a cold cache', () => {
    expect(getCached('key1')).toBeNull()
  })

  it('returns stored data after setCached', () => {
    setCached('key1', DUMMY)
    expect(getCached('key1')).toEqual(DUMMY)
  })

  it('clearCache removes all entries', () => {
    setCached('key1', DUMMY)
    setCached('key2', DUMMY)
    clearCache()
    expect(getCached('key1')).toBeNull()
    expect(getCached('key2')).toBeNull()
  })

  it('different keys are independent', () => {
    setCached('a', DUMMY)
    expect(getCached('b')).toBeNull()
  })
})
