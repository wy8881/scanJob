import Elysia, { t } from 'elysia'
import { queryStats } from '../db/stats'

export const statsRoutes = new Elysia().get(
  '/stats',
  async ({ query, error }) => {
    const from = query.from
      ? new Date(query.from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const to = query.to ? new Date(query.to) : new Date()

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return error(400, { error: 'Invalid date. Use ISO format: YYYY-MM-DD' })
    }

    return queryStats(from, to)
  },
  {
    query: t.Object({
      from: t.Optional(t.String()),
      to: t.Optional(t.String()),
    }),
  }
)
