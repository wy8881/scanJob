import { describe, it, expect } from 'bun:test'
import { computeCumulative, getDateRange, getEnabledRanges } from './transforms'

describe('computeCumulative', () => {
  it('returns running total', () => {
    const input = [
      { date: '2026-05-01', count: 10 },
      { date: '2026-05-02', count: 5 },
      { date: '2026-05-03', count: 8 },
    ]
    const result = computeCumulative(input)
    expect(result).toEqual([
      { date: '2026-05-01', count: 10 },
      { date: '2026-05-02', count: 15 },
      { date: '2026-05-03', count: 23 },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(computeCumulative([])).toEqual([])
  })
})

describe('getEnabledRanges', () => {
  it('only enables month when no data', () => {
    const result = getEnabledRanges(null)
    expect(result.month).toBe(true)
    expect(result['3months']).toBe(false)
    expect(result['6months']).toBe(false)
    expect(result.year).toBe(false)
  })

  it('enables 3months when earliest date is 3+ months ago', () => {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 4)
    const result = getEnabledRanges(threeMonthsAgo.toISOString().split('T')[0])
    expect(result['3months']).toBe(true)
    expect(result['6months']).toBe(false)
  })
})

describe('getDateRange', () => {
  it('month range starts on the 1st of this month', () => {
    const { from } = getDateRange('month')
    expect(from.getDate()).toBe(1)
    expect(from.getMonth()).toBe(new Date().getMonth())
  })
})
