import Elysia, { t } from 'elysia'
import { queryStats } from '../db/stats'
import { getCached, setCached } from '../lib/statsCache'

export const statsRoutes = new Elysia().get(
  '/stats',
  async ({ query, set }) => {
    const from = query.from
      ? new Date(query.from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const to = query.to ? new Date(query.to) : new Date()

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      set.status = 400
      return { error: 'Invalid date. Use ISO format: YYYY-MM-DD' }
    }

    const category = query.category || undefined
    const cacheKey = `${from.toISOString()}_${to.toISOString()}_${category ?? ''}`

    const cached = getCached(cacheKey)
    if (cached) return cached

    const result = await queryStats(from, to, category)
    setCached(cacheKey, result)
    return result
  },
  {
    query: t.Object({
      from: t.Optional(t.String()),
      to: t.Optional(t.String()),
      category: t.Optional(t.String()),
    }),
  }
)
