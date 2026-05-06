import type { TimeRange } from './types'

export function computeCumulative(
  byDay: { date: string; count: number }[]
): { date: string; count: number }[] {
  let running = 0
  return byDay.map(({ date, count }) => {
    running += count
    return { date, count: running }
  })
}

export function getDateRange(range: TimeRange): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()
  if (range === 'month') {
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
  } else if (range === '3months') {
    from.setMonth(from.getMonth() - 3)
    from.setHours(0, 0, 0, 0)
  } else if (range === '6months') {
    from.setMonth(from.getMonth() - 6)
    from.setHours(0, 0, 0, 0)
  } else {
    from.setMonth(0)
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
  }
  return { from, to }
}

export function getEnabledRanges(
  earliestJobDate: string | null
): Record<TimeRange, boolean> {
  if (!earliestJobDate) {
    return { month: true, '3months': false, '6months': false, year: false }
  }
  const earliest = new Date(earliestJobDate)
  const now = new Date()
  const monthsAgo =
    (now.getFullYear() - earliest.getFullYear()) * 12 +
    (now.getMonth() - earliest.getMonth())
  return {
    month: true,
    '3months': monthsAgo >= 3,
    '6months': monthsAgo >= 6,
    year: monthsAgo >= 2,
  }
}
